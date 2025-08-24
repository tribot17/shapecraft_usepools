import json
import os
from typing import List, Dict, Any, Optional, Set
from datetime import datetime
from app.models.models import UserProfile, UserPreferences
from app.services.storage import storage

class GroupManager:
    """Manages group chat functionality and collective planning"""
    
    def __init__(self):
        self.groups_dir = "data/groups"
        os.makedirs(self.groups_dir, exist_ok=True)
    
    def save_group_info(self, chat_id: int, group_data: Dict[str, Any]) -> bool:
        """Save group information"""
        try:
            file_path = os.path.join(self.groups_dir, f"{chat_id}.json")
            group_data['updated_at'] = datetime.now().isoformat()
            
            with open(file_path, 'w') as f:
                json.dump(group_data, f, indent=2)
            return True
        except Exception as e:
            print(f"Error saving group info: {e}")
            return False
    
    def load_group_info(self, chat_id: int) -> Optional[Dict[str, Any]]:
        """Load group information"""
        try:
            file_path = os.path.join(self.groups_dir, f"{chat_id}.json")
            if not os.path.exists(file_path):
                return None
            
            with open(file_path, 'r') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading group info: {e}")
            return None
    
    def add_member_to_group(self, chat_id: int, user_id: int, username: str = None) -> bool:
        """Add a member to group"""
        group_info = self.load_group_info(chat_id) or {
            'chat_id': chat_id,
            'members': [],
            'created_at': datetime.now().isoformat()
        }
        
        # Check if member already exists
        for member in group_info['members']:
            if member['user_id'] == user_id:
                return True  # Already exists
        
        # Add new member
        group_info['members'].append({
            'user_id': user_id,
            'username': username,
            'joined_at': datetime.now().isoformat()
        })
        
        return self.save_group_info(chat_id, group_info)
    
    def get_group_members(self, chat_id: int) -> List[Dict[str, Any]]:
        """Get all group members"""
        group_info = self.load_group_info(chat_id)
        if group_info:
            return group_info.get('members', [])
        return []
    
    def get_collective_preferences(self, chat_id: int) -> Dict[str, Any]:
        """Get collective preferences for group planning"""
        members = self.get_group_members(chat_id)
        
        if not members:
            return {}
        
        # Load all member profiles
        member_profiles = []
        for member in members:
            profile = storage.load_user_profile(member['user_id'])
            if profile:
                member_profiles.append(profile)
        
        if not member_profiles:
            return {}
        
        # Aggregate preferences
        collective_prefs = {
            'dietary_restrictions': set(),
            'allergies': set(),
            'budget_ranges': [],
            'preferred_cuisines': set(),
            'travel_styles': [],
            'accommodation_types': set(),
            'activities_liked': set(),
            'activities_disliked': set(),
            'member_count': len(member_profiles)
        }
        
        for profile in member_profiles:
            prefs = profile.preferences
            
            # Combine dietary restrictions (union - anyone with restrictions affects all)
            collective_prefs['dietary_restrictions'].update(prefs.dietary_restrictions)
            collective_prefs['allergies'].update(prefs.allergies)
            
            # Collect budget ranges
            if prefs.budget_range:
                collective_prefs['budget_ranges'].append(prefs.budget_range)
            
            # Combine cuisine preferences
            collective_prefs['preferred_cuisines'].update(prefs.preferred_cuisines)
            
            # Collect travel styles
            if prefs.travel_style:
                collective_prefs['travel_styles'].append(prefs.travel_style)
            
            # Combine accommodation types
            collective_prefs['accommodation_types'].update(prefs.accommodation_type)
            
            # Activities - intersection for liked, union for disliked
            collective_prefs['activities_liked'].update(prefs.activities_liked)
            collective_prefs['activities_disliked'].update(prefs.activities_disliked)
        
        # Convert sets to lists for JSON serialization
        result = {}
        for key, value in collective_prefs.items():
            if isinstance(value, set):
                result[key] = list(value)
            else:
                result[key] = value
        
        # Determine consensus budget
        result['consensus_budget'] = self._get_consensus_budget(collective_prefs['budget_ranges'])
        
        return result
    
    def _get_consensus_budget(self, budget_ranges: List[str]) -> str:
        """Determine consensus budget from individual preferences"""
        if not budget_ranges:
            return "moderate"
        
        budget_weights = {"budget": 1, "moderate": 2, "luxury": 3}
        
        # Calculate average budget preference
        total_weight = sum(budget_weights.get(b, 2) for b in budget_ranges)
        avg_weight = total_weight / len(budget_ranges)
        
        # Map back to budget category
        if avg_weight <= 1.3:
            return "budget"
        elif avg_weight >= 2.7:
            return "luxury"
        else:
            return "moderate"
    
    def find_compatible_options(self, chat_id: int, options: List[Dict[str, Any]], 
                              option_type: str) -> List[Dict[str, Any]]:
        """Filter options based on group compatibility"""
        collective_prefs = self.get_collective_preferences(chat_id)
        
        if not collective_prefs:
            return options
        
        compatible_options = []
        
        for option in options:
            is_compatible = True
            
            if option_type == "restaurant":
                # Check dietary restrictions
                if collective_prefs.get('dietary_restrictions'):
                    option_description = option.get('description', '').lower()
                    for restriction in collective_prefs['dietary_restrictions']:
                        if restriction.lower() == 'vegetarian':
                            if 'vegetarian' not in option_description and 'vegan' not in option_description:
                                # Check if restaurant has vegetarian options
                                if 'menu' not in option_description:
                                    is_compatible = False
                                    break
                        elif restriction.lower() == 'halal':
                            if 'halal' not in option_description:
                                is_compatible = False
                                break
                
                # Check allergies
                if collective_prefs.get('allergies'):
                    option_name = option.get('name', '').lower()
                    option_description = option.get('description', '').lower()
                    for allergy in collective_prefs['allergies']:
                        if allergy.lower() in option_name or allergy.lower() in option_description:
                            is_compatible = False
                            break
            
            elif option_type == "hotel":
                # Check budget compatibility
                consensus_budget = collective_prefs.get('consensus_budget', 'moderate')
                price = option.get('price_per_night', 0)
                
                if consensus_budget == "budget" and price > 150:
                    is_compatible = False
                elif consensus_budget == "luxury" and price < 200:
                    is_compatible = False
                elif consensus_budget == "moderate" and (price < 80 or price > 300):
                    is_compatible = False
            
            elif option_type == "activity":
                # Check against disliked activities
                disliked = collective_prefs.get('activities_disliked', [])
                activity_type = option.get('type', '').lower()
                activity_name = option.get('name', '').lower()
                
                for disliked_activity in disliked:
                    if disliked_activity.lower() in activity_type or disliked_activity.lower() in activity_name:
                        is_compatible = False
                        break
            
            if is_compatible:
                # Add compatibility score
                option['group_compatibility_score'] = self._calculate_compatibility_score(
                    option, collective_prefs, option_type
                )
                compatible_options.append(option)
        
        # Sort by compatibility score
        compatible_options.sort(key=lambda x: x.get('group_compatibility_score', 0), reverse=True)
        
        return compatible_options
    
    def _calculate_compatibility_score(self, option: Dict[str, Any], 
                                     collective_prefs: Dict[str, Any], option_type: str) -> float:
        """Calculate compatibility score for an option"""
        score = 0.0
        
        if option_type == "restaurant":
            # Bonus for matching cuisine preferences
            if collective_prefs.get('preferred_cuisines'):
                option_cuisine = option.get('cuisine', '').lower()
                for pref_cuisine in collective_prefs['preferred_cuisines']:
                    if pref_cuisine.lower() in option_cuisine:
                        score += 0.3
            
            # Bonus for accommodating dietary restrictions
            if collective_prefs.get('dietary_restrictions'):
                option_description = option.get('description', '').lower()
                if 'vegetarian' in option_description or 'vegan' in option_description:
                    score += 0.2
                if 'halal' in option_description:
                    score += 0.2
        
        elif option_type == "hotel":
            # Score based on budget alignment
            consensus_budget = collective_prefs.get('consensus_budget', 'moderate')
            price = option.get('price_per_night', 0)
            
            if consensus_budget == "budget" and price <= 100:
                score += 0.3
            elif consensus_budget == "moderate" and 100 <= price <= 250:
                score += 0.3
            elif consensus_budget == "luxury" and price >= 200:
                score += 0.3
        
        elif option_type == "activity":
            # Bonus for matching liked activities
            if collective_prefs.get('activities_liked'):
                activity_type = option.get('type', '').lower()
                activity_name = option.get('name', '').lower()
                for liked in collective_prefs['activities_liked']:
                    if liked.lower() in activity_type or liked.lower() in activity_name:
                        score += 0.4
        
        return score
    
    def get_group_summary(self, chat_id: int) -> str:
        """Get a summary of group preferences for display"""
        collective_prefs = self.get_collective_preferences(chat_id)
        members = self.get_group_members(chat_id)
        
        if not collective_prefs:
            return "No group preferences available yet. Members need to chat with me individually first!"
        
        summary_parts = [
            f"👥 **Group Travel Profile** ({collective_prefs['member_count']} members)"
        ]
        
        if collective_prefs.get('dietary_restrictions'):
            summary_parts.append(f"🥗 **Dietary needs:** {', '.join(collective_prefs['dietary_restrictions'])}")
        
        if collective_prefs.get('allergies'):
            summary_parts.append(f"⚠️ **Allergies:** {', '.join(collective_prefs['allergies'])}")
        
        summary_parts.append(f"💰 **Group budget:** {collective_prefs.get('consensus_budget', 'moderate').title()}")
        
        if collective_prefs.get('preferred_cuisines'):
            summary_parts.append(f"🍽️ **Cuisine preferences:** {', '.join(list(collective_prefs['preferred_cuisines'])[:5])}")
        
        if collective_prefs.get('activities_liked'):
            summary_parts.append(f"🎯 **Liked activities:** {', '.join(list(collective_prefs['activities_liked'])[:5])}")
        
        if collective_prefs.get('activities_disliked'):
            summary_parts.append(f"❌ **Avoid:** {', '.join(list(collective_prefs['activities_disliked'])[:3])}")
        
        # Add member list
        member_names = []
        for member in members:
            name = member.get('username') or f"User {member['user_id']}"
            member_names.append(name)
        
        if member_names:
            summary_parts.append(f"👤 **Members:** {', '.join(member_names)}")
        
        return "\n".join(summary_parts)
    
    def handle_missing_member_info(self, chat_id: int, mentioned_user: str) -> str:
        """Handle cases where we don't have info about a mentioned group member"""
        return f"""❓ I don't have travel preferences for **{mentioned_user}** yet.

{mentioned_user}, please:
1. Send me a private message with /start
2. Chat with me about your travel preferences
3. Then I can include your preferences in group planning!

For now, I'll suggest options based on other group members."""

# Global group manager instance
group_manager = GroupManager()

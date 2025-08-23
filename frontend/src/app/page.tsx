"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

export default function Home() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Ensure video plays automatically
    if (videoRef.current) {
      videoRef.current.play().catch(error => {
        console.log("Video autoplay failed:", error);
      });
    }
  }, []);

  return (
    <main className="relative h-screen w-full bg-[#141414] overflow-hidden">
      {/* Video Background */}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-50"
      >
        <source src="/videos/intro_scooby.mp4" type="video/mp4" />
      </video>

      {/* Content Overlay */}
      <div className="relative z-10 flex flex-col items-center justify-start h-full px-4 pt-32">
        <div className="text-center flex flex-col items-center">
          <div className="space-y-4 mb-96">
            <span className="text-sm font-medium text-white/60">Alpha 0.1</span>
            <h1 className="text-6xl md:text-8xl font-bold text-white tracking-tight">
              &Scooby
            </h1>
            <p className="text-xl md:text-2xl text-white/80 font-light">
              Your NFT companion. Join the revolution
            </p>
          </div>
          <button
            onClick={() => router.push('/chat')}
            className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 bg-blue-600/10 hover:bg-blue-600/20 text-white text-lg font-medium rounded-2xl transition-all duration-200 overflow-hidden hover:scale-105 hover:shadow-lg hover:shadow-blue-500/20"
          >
            <span className="relative z-10 flex items-center gap-2">
              {/* Paw Icon */}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="w-6 h-6 fill-current">
                <path d="M226.5 92.9c14.3 42.9-.3 86.2-32.6 96.8s-70.1-15.6-84.4-58.5s.3-86.2 32.6-96.8s70.1 15.6 84.4 58.5zM100.4 198.6c18.9 32.4 14.3 70.1-10.2 84.1s-59.7-.9-78.5-33.3S-2.7 179.3 21.8 165.3s59.7 .9 78.5 33.3zM69.2 401.2C121.6 259.9 214.7 224 256 224s134.4 35.9 186.8 177.2c3.6 9.7 5.2 20.1 5.2 30.5v1.6c0 25.8-20.9 46.7-46.7 46.7c-11.5 0-22.9-1.4-34-4.2l-88-22c-15.3-3.8-31.3-3.8-46.6 0l-88 22c-11.1 2.8-22.5 4.2-34 4.2C84.9 480 64 459.1 64 433.3v-1.6c0-10.4 1.6-20.8 5.2-30.5zM421.8 282.7c-24.5-14-29.1-51.7-10.2-84.1s54-47.3 78.5-33.3s29.1 51.7 10.2 84.1s-54 47.3-78.5 33.3zM310.1 189.7c-32.3-10.6-46.9-53.9-32.6-96.8s52.1-69.1 84.4-58.5s46.9 53.9 32.6 96.8s-52.1 69.1-84.4 58.5z" />
              </svg>
              Trigger Scooby
            </span>
            {/* Animated background gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-blue-400/20 to-blue-600/20 transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
          </button>
        </div>
      </div>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-[#141414]/50 pointer-events-none"></div>
    </main>
  );
}

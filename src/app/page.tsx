"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { clearServiceWorkersInDev } from "@/lib/utils/clearServiceWorkers";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Clear service workers in development to prevent caching conflicts
    clearServiceWorkersInDev();
    
    // For now, just redirect to login
    router.replace("/login");
  }, [router]);

  // Show loading state
  return (
    <main className="min-h-screen bg-gradient-to-br from-saffron-50 to-saffron-100 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-saffron-800 mb-4">
          VaikunthaPOS
        </h1>
        <p className="text-saffron-600 text-lg">
          ISKCON Temple Point of Sale System
        </p>
        <div className="mt-8">
          <div className="inline-block bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-saffron-600"></div>
              <p className="text-gray-600">Loading...</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}



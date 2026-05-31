import React, { useState } from "react";
import { Link } from "react-router-dom";
import { db } from "../../firebase/firebase";
import { collection, doc, setDoc, serverTimestamp } from "firebase/firestore";

export default function LandingPage({
  children,
}: {
  children: React.ReactNode;
}) {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage("");
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      setMessage("Please enter a valid email address.");
      return;
    }
    setIsSubmitting(true);
    try {
      // Use email as document ID, encode to avoid invalid chars
      const safeEmail = email.replace(/\./g, ",");
      const waitlistDocRef = doc(collection(db, "waitlistsignups"), safeEmail);
      await setDoc(waitlistDocRef, {
        email,
        signed_up_at: serverTimestamp(),
      });
      setMessage("Thank you for signing up! You'll be the first to know.");
      setEmail("");
    } catch (err) {
      console.error(err);
      setMessage("There was an error signing up. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#fbf9f6] p-6 sm:p-0">
      <div className="max-w-md w-full flex flex-col items-center text-center p-6">
        <div className="w-32 h-32 mb-4">
          <img
            src="./favicon.png"
            alt="TrendTune Logo"
            width={128}
            height={128}
            className="mx-auto"
          />
        </div>

        <h1 className="text-4xl font-bold mb-4">TrendTune</h1>

        <p className="text-center max-w-lg mb-2">
          TrendTune helps you go from scattered data to actionable insights. Identify emerging trends, generate
          strategy plans, and execute with AI—no data team required.
        </p>

        <p className="text-gray-500 mb-8">
          Vibe Marketer. Vibe Product Strategist. Vibe Sales.
        </p>

        <h2 className="text-3xl font-bold mb-8">May 13th 8pm</h2>

        <form
          className="w-full max-w-lg flex items-center justify-center mx-auto"
          onSubmit={handleSignUp}
          aria-label="Sign up for updates form"
        >
          <input
            type="email"
            value={email}
            onChange={handleEmailChange}
            className="flex-[0_0_80%] rounded-l-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-gray-300 text-gray-900 text-lg h-14"
            placeholder="Enter your email"
            aria-label="Email address"
            tabIndex={0}
            required
            autoComplete="email"
          />
          <button
            type="submit"
            className="flex-[0_0_20%] rounded-r-full bg-[#3b82f6] hover:bg-[#2563eb] text-white font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400 text-lg h-14 -ml-px"
            disabled={isSubmitting}
            aria-label="Sign up for updates"
            tabIndex={0}
            style={{ minWidth: 0 }}
          >
            {isSubmitting ? "..." : "Sign up"}
          </button>
        </form>
        {message && (
          <p className="text-sm mt-2 text-gray-700" role="status">{message}</p>
        )}
      </div>
    </div>
  );
}

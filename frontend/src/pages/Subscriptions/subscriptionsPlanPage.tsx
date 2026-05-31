// src/pages/SubscriptionPlansPage.tsx

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { auth, db } from '../../firebase/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import {
  FaCcVisa,
  FaCcMastercard,
  FaCcAmex,
  FaCcDiscover,
} from 'react-icons/fa';

interface Plan {
  name: string;
  price: string;
  features: string[];
  popular?: boolean;
}

const plans: Plan[] = [
  {
    name: 'Free',
    price: '$0',
    features: [
      'Basic trend insights',
      'Limited AI recommendations',
      'Community support',
      'Up to 5 chats and 50 messages a day',
    ],
  },
  {
    name: 'Entrepreneur',
    price: '$49/mo',
    features: [
      'Advanced trend analysis',
      'Unlimited AI recommendations',
      'Priority support',
      'Integrations & API access',
    ],
    popular: true,
  },
];

const SubscriptionPlansPage: React.FC = () => {
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const ref = doc(db, 'users', user.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setCurrentPlan(String(snap.data().current_plan).toLowerCase());
        }
      }
    });
    return unsub;
  }, []);

  const openUpgradeModal = (plan: Plan) => {
    setSelectedPlan(plan);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setCardNumber('');
    setCardName('');
    setExpiry('');
    setCvv('');
  };

  const handleUpgradeSubmit = () => {
    // TODO: integrate with payment gateway
    alert(`Upgraded to ${selectedPlan?.name}!`);
    closeModal();
  };

  return (
    <section className="max-w-4xl mx-auto py-16 px-4">
      <h1 className="text-4xl font-extrabold text-center">Choose Your Plan</h1>
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        {plans.map((plan) => {
          const planKey = plan.name.toLowerCase();
          const isCurrent = planKey === currentPlan;
          const isUpgrade =
            currentPlan === 'free' && planKey === 'entrepreneur';

          let buttonText = plan.name === 'Free' ? 'Get Started' : 'Subscribe';
          if (isCurrent) buttonText = 'Current Plan';
          else if (isUpgrade) buttonText = 'Upgrade';

          const btnClasses = `w-full text-center font-semibold rounded-full px-6 py-3 ${
            plan.popular
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'border border-gray-300 hover:bg-gray-100 text-gray-800'
          }`;

          const disabledClasses =
            'w-full text-center font-semibold rounded-full px-6 py-3 border border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed';

          const toPath = planKey === 'free' ? '/signup' : '/subscribe';

          return (
            <div
              key={plan.name}
              className={`relative border rounded-2xl p-8 shadow-sm ${
                plan.popular ? 'border-blue-500' : 'border-gray-200'
              }`}
            >
              {plan.popular && (
                <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs uppercase px-3 py-1 rounded-lg">
                  Most Popular
                </div>
              )}
              <h2 className="text-2xl font-semibold mb-4">{plan.name}</h2>
              <p className="text-3xl font-bold mb-6">{plan.price}</p>
              <ul className="mb-6 space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center">
                    <svg
                      className="w-5 h-5 text-green-500 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <span className={disabledClasses}>{buttonText}</span>
              ) : isUpgrade ? (
                <button
                  onClick={() => openUpgradeModal(plan)}
                  className={btnClasses}
                >
                  {buttonText}
                </button>
              ) : (
                <Link to={toPath} className={btnClasses}>
                  {buttonText}
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {modalOpen && selectedPlan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md p-6 relative">
            <h3 className="text-xl font-semibold mb-4">
              Upgrade to {selectedPlan.name}
            </h3>
            <div className="flex gap-4 mb-4">
              <FaCcVisa size={32} />
              <FaCcMastercard size={32} />
              <FaCcAmex size={32} />
              <FaCcDiscover size={32} />
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleUpgradeSubmit();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium mb-1">
                  Card Number
                </label>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder="1234 5678 9012 3456"
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Name on Card
                </label>
                <input
                  type="text"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  placeholder="JOHN DOE"
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Expiry</label>
                  <input
                    type="text"
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                    placeholder="MM/YY"
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">CVV</label>
                  <input
                    type="password"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value)}
                    placeholder="123"
                    maxLength={4}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end gap-4 mt-6">
                <button
                  type="button"
                  onClick={closeModal}
                  className="text-gray-600 hover:underline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white rounded-full px-6 py-2 hover:bg-blue-700 transition"
                >
                  Upgrade
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

export default SubscriptionPlansPage;

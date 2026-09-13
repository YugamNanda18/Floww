import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';

/**
 * useRazorpay — Loads the Razorpay checkout modal and handles the payment flow.
 * The SDK is already loaded via <script> tag in index.html.
 */
export const useRazorpay = () => {
  const [processing, setProcessing] = useState(false);

  const openCheckout = useCallback(async ({
    orderId,
    amount,
    currency = 'INR',
    keyId,
    prefill,
    onSuccess,
    onFailure,
  }) => {
    if (!window.Razorpay) {
      toast.error('Payment gateway not available. Please refresh.');
      return;
    }

    setProcessing(true);

    const options = {
      key: keyId || 'rzp_test_SaBIZZXv7zDJJL',
      amount,
      currency,
      ...(orderId && !orderId.startsWith('order_demo_') ? { order_id: orderId } : {}),
      name: 'LedgerX — College Finance',
      description: 'Fee Payment',
      image: '/logo.svg',
      prefill,
      theme: { color: '#4f46e5' },
      modal: {
        ondismiss: () => {
          setProcessing(false);
          toast('Payment cancelled.', { icon: '🚫' });
        },
      },
      handler: async (response) => {
        try {
          if (onSuccess) {
            await onSuccess({
              ...response,
              razorpay_order_id: response.razorpay_order_id || orderId,
            });
          }
        } catch (err) {
          toast.error('Payment verification failed. Contact support.');
          if (onFailure) onFailure(err);
        } finally {
          setProcessing(false);
        }
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', (response) => {
      setProcessing(false);
      toast.error(`Payment failed: ${response.error.description}`);
      if (onFailure) onFailure(response.error);
    });

    rzp.open();
  }, []);

  return { openCheckout, processing };
};

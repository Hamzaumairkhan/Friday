import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ShieldCheck,
  Building,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  Loader2,
  Calendar,
  Users,
  Copy,
  Check,
  Smartphone,
  CheckCircle,
} from 'lucide-react';
import { bookingsService } from '../../services/bookings';
import ImageUpload from '../../components/shared/ImageUpload';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import toast from 'react-hot-toast';

export default function BookingDetailPage() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);

  const fetchBookingData = async () => {
    setLoading(true);
    try {
      const [bookingData, proofData] = await Promise.all([
        bookingsService.getBooking(bookingId),
        bookingsService.getPaymentProof(bookingId),
      ]);
      setBooking(bookingData);
      setPaymentInfo(proofData);
      if (bookingData.payment_proof_url) {
        setScreenshotUrl(bookingData.payment_proof_url);
      }
    } catch (err) {
      console.error('Error fetching booking details:', err);
      toast.error('Failed to load booking details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookingData();
  }, [bookingId]);

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSubmitProof = async () => {
    if (!screenshotUrl) {
      toast.error('Please select or upload a payment screenshot first.');
      return;
    }

    setIsSubmittingProof(true);
    try {
      const updated = await bookingsService.submitPaymentProof(bookingId, screenshotUrl);
      setBooking(updated);
      toast.success('Payment proof submitted successfully! Your reservation is now pending organizer verification.', { duration: 4000 });
      // Redirect traveler to My Trips / Bookings where pending status is displayed
      navigate('/my-trips?tab=bookings');
    } catch (err) {
      console.error('Payment proof submission error:', err);
      toast.error(err.message || 'Failed to submit payment proof.');
    } finally {
      setIsSubmittingProof(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Fetching booking and payment details..." />;
  }

  if (!booking) {
    return (
      <div className="text-center py-20 space-y-4">
        <h2 className="text-3xl font-normal" style={{ fontFamily: "'Instrument Serif', serif" }}>
          Booking not found
        </h2>
        <Link to="/my-trips">
          <button className="px-6 py-2 rounded-full border border-black/10 text-sm">
            Back to My Bookings
          </button>
        </Link>
      </div>
    );
  }

  const orgPayment = paymentInfo?.organizer_payment_info;
  const isVerified = booking.payment_status === 'VERIFIED';
  const isProofUploaded = booking.payment_status === 'PROOF_UPLOADED';
  const isRejected = booking.payment_status === 'REJECTED';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* ─── Back Link ───────────────────────────────────────────────── */}
      <Link
        to="/my-trips"
        className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#6F6F6F] hover:text-black transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" /> Back to My Trips
      </Link>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-12">
        {/* ─── Center Column: Main Payment Flow (Stitch 7_complete_booking) ─ */}
        <div className="xl:col-span-8 space-y-10">
          {/* Header */}
          <div>
            <h1
              className="text-4xl sm:text-5xl font-normal text-black italic mb-3"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              Complete your booking.
            </h1>
            <p className="text-sm sm:text-base text-[#6F6F6F]" style={{ fontFamily: 'Inter, sans-serif' }}>
              Secure your spot for the {booking.package_title || 'Expedition'}. Please complete your direct payment below.
            </p>
          </div>

          {/* Trip Summary Card */}
          <div className="bg-white rounded-3xl border border-black/10 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <span
                  className={`inline-block text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-3 ${
                    isVerified
                      ? 'bg-emerald-100 text-emerald-800'
                      : isProofUploaded
                      ? 'bg-blue-100 text-blue-800'
                      : isRejected
                      ? 'bg-red-100 text-red-800'
                      : 'bg-[#FFDBD0] text-[#420E00]'
                  }`}
                >
                  {isVerified ? 'PAYMENT VERIFIED' : isProofUploaded ? 'PROOF SUBMITTED / UNDER REVIEW' : 'PAYMENT REQUIRED'}
                </span>
                <h2
                  className="text-3xl font-normal text-black uppercase"
                  style={{ fontFamily: "'Instrument Serif', serif" }}
                >
                  {booking.package_title || 'Expedition Booking'}
                </h2>
                <p className="text-xs text-[#6F6F6F] mt-1">
                  Organized by <span className="font-semibold text-black">{orgPayment?.name || 'Verified Partner'}</span>
                </p>
              </div>

              <div className="text-right">
                <p className="text-[11px] uppercase font-semibold text-[#6F6F6F]">Total Due</p>
                <p className="text-3xl font-normal text-black" style={{ fontFamily: "'Instrument Serif', serif" }}>
                  PKR {Number(booking.total_price || 0).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex gap-6 pt-4 border-t border-black/10 text-xs text-[#555E59]">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#6F6F6F]" />
                <span>{booking.travelers} Traveler(s)</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#6F6F6F]" />
                <span>Status: {booking.status}</span>
              </div>
            </div>
          </div>

          {/* Payment Methods Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-normal text-[#00261D]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                Organizer Payment Details
              </h3>
              {orgPayment?.contact_phone && (
                <span className="text-xs text-[#717975] flex items-center gap-1.5 font-medium">
                  <Smartphone className="w-3.5 h-3.5 text-emerald-800" /> Host WhatsApp: <strong className="text-[#00261D]">{orgPayment.contact_phone}</strong>
                </span>
              )}
            </div>

            {/* Dynamic Receiving Account Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-black/10 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-center">
                    <Building className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-[#00261D]">
                      {orgPayment?.payment_bank_name || orgPayment?.payment_wallet_type || 'Direct Bank / Mobile Wallet Transfer'}
                    </h4>
                    <p className="text-xs text-[#717975]">
                      Official receiving account registered by <strong className="text-[#00261D]">{orgPayment?.name || booking.organizer_name || 'Tour Operator'}</strong>
                    </p>
                  </div>
                </div>

                <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-100/80 text-emerald-900 border border-emerald-200">
                  {orgPayment?.payment_wallet_type || 'VERIFIED ACCOUNT'}
                </span>
              </div>

              <div className="bg-[#FAFBF9] p-5 rounded-2xl border border-black/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#717975]">
                      ACCOUNT TITLE:
                    </span>
                    <span className="font-bold text-[#00261D] text-sm tracking-wide">
                      {orgPayment?.payment_account_title || orgPayment?.name || booking.organizer_name || 'Organizer'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#717975]">
                      ACCOUNT NO / IBAN:
                    </span>
                    <span className="font-mono font-bold text-[#00261D] text-base sm:text-lg">
                      {orgPayment?.payment_account_number || orgPayment?.contact_phone || 'Account info upon request'}
                    </span>
                  </div>

                  <p className="text-[11px] text-[#717975] pt-1">
                    Bank / Provider: <strong className="text-[#00261D]">{orgPayment?.payment_bank_name || orgPayment?.payment_wallet_type || 'Bank / Wallet Transfer'}</strong>
                  </p>
                </div>

                <button
                  onClick={() => copyToClipboard(orgPayment?.payment_account_number || orgPayment?.contact_phone || '', 'acc_num')}
                  className="px-4 py-2.5 rounded-full bg-[#00261D] text-white hover:bg-[#00261D]/90 text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer shrink-0"
                  title="Copy Account Number"
                >
                  {copiedKey === 'acc_num' ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" /> Copy Number
                    </>
                  )}
                </button>
              </div>

              {orgPayment?.instructions && (
                <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 space-y-0.5">
                  <span className="font-bold block uppercase text-[10px] tracking-wider text-amber-800">
                    Organizer Instructions:
                  </span>
                  <p>{orgPayment.instructions}</p>
                </div>
              )}
            </div>
          </div>

          {/* ─── Upload Receipt Section (Stitch Dropzone) ─────────────── */}
          {!isVerified && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-black/10 shadow-sm space-y-6">
              <div>
                <h3 className="text-2xl font-normal text-black mb-1" style={{ fontFamily: "'Instrument Serif', serif" }}>
                  Upload Receipt
                </h3>
                <p className="text-xs sm:text-sm text-[#6F6F6F]">
                  Please upload a screenshot or image of your transaction slip to confirm your reservation.
                </p>
              </div>

              <ImageUpload
                value={screenshotUrl}
                onChange={setScreenshotUrl}
                label="Payment Receipt / Screenshot"
              />

              <button
                onClick={handleSubmitProof}
                disabled={isSubmittingProof || !screenshotUrl}
                className="w-full py-4 rounded-full bg-black text-white text-xs font-bold uppercase tracking-wider hover:bg-slate-900 transition-all hover:scale-[1.02] disabled:opacity-50 cursor-pointer shadow-lg flex items-center justify-center gap-2"
              >
                {isSubmittingProof ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Payment Proof for Verification'}
              </button>

              <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-xs text-emerald-950">
                <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Organizer Verification</p>
                  <p className="text-[11px] text-emerald-800">
                    Your host will review the uploaded transaction receipt and personally confirm your reservation and trip group invite.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Access Trip Group CTA if Verified */}
          {isVerified && booking.package_id && (
            <div className="p-6 rounded-3xl bg-emerald-900 text-white space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-300" />
                <h3 className="text-2xl font-normal" style={{ fontFamily: "'Instrument Serif', serif" }}>
                  Reservation Confirmed!
                </h3>
              </div>
              <p className="text-xs text-emerald-100">
                Your payment has been verified by the organizer. You have been added to the private Trip Group.
              </p>
              <Link to={`/trips/${booking.package_id}/group`}>
                <button className="px-6 py-3 rounded-full bg-white text-emerald-950 text-xs font-bold uppercase tracking-wider hover:bg-emerald-50 transition-transform hover:scale-105 shadow-md">
                  Open Trip Group & Chat &rarr;
                </button>
              </Link>
            </div>
          )}
        </div>

        {/* ─── Right Panel: Progress Tracker (Stitch 7_complete_booking) ─ */}
        <aside className="xl:col-span-4">
          <div className="sticky top-24 bg-white rounded-3xl border border-black/10 p-6 sm:p-8 shadow-sm space-y-8">
            <h4 className="text-xs font-bold text-[#6F6F6F] uppercase tracking-widest">
              BOOKING STATUS
            </h4>

            {/* Vertical Stepper */}
            <div className="relative pl-6 space-y-8">
              <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-slate-200" />

              {/* Step 1: Booking Created */}
              <div className="relative flex items-center gap-4">
                <div className="absolute -left-[31px] w-5 h-5 bg-black text-white rounded-full flex items-center justify-center text-[10px] font-bold border-4 border-white shadow-xs">
                  <Check className="w-3 h-3" />
                </div>
                <div>
                  <p className="text-xs font-bold text-black">Booking Created</p>
                  <p className="text-[11px] text-[#6F6F6F]">Spot reserved on platform</p>
                </div>
              </div>

              {/* Step 2: Payment Required / Uploaded */}
              <div className="relative flex items-center gap-4">
                <div
                  className={`absolute -left-[31px] w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border-4 border-white shadow-xs ${
                    isVerified || isProofUploaded
                      ? 'bg-black text-white'
                      : 'bg-[#420E00] text-white animate-pulse'
                  }`}
                >
                  {isVerified || isProofUploaded ? <Check className="w-3 h-3" /> : '2'}
                </div>
                <div>
                  <p className="text-xs font-bold text-black">Direct Payment</p>
                  <p className="text-[11px] text-[#6F6F6F]">
                    {isProofUploaded ? 'Receipt uploaded' : 'Pay via Bank / JazzCash'}
                  </p>
                </div>
              </div>

              {/* Step 3: Reviewing */}
              <div className="relative flex items-center gap-4">
                <div
                  className={`absolute -left-[31px] w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border-4 border-white shadow-xs ${
                    isVerified
                      ? 'bg-black text-white'
                      : isProofUploaded
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-200 text-[#6F6F6F]'
                  }`}
                >
                  {isVerified ? <Check className="w-3 h-3" /> : '3'}
                </div>
                <div>
                  <p className="text-xs font-bold text-black">Host Verification</p>
                  <p className="text-[11px] text-[#6F6F6F]">
                    {isVerified ? 'Approved' : isProofUploaded ? 'In progress (within 2h)' : 'Pending proof'}
                  </p>
                </div>
              </div>

              {/* Step 4: Confirmed & Group Access */}
              <div className="relative flex items-center gap-4">
                <div
                  className={`absolute -left-[31px] w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border-4 border-white shadow-xs ${
                    isVerified ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-[#6F6F6F]'
                  }`}
                >
                  {isVerified ? <Check className="w-3 h-3" /> : '4'}
                </div>
                <div>
                  <p className="text-xs font-bold text-black">Confirmed Expedition</p>
                  <p className="text-[11px] text-[#6F6F6F]">Community group access</p>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

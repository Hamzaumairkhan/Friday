import WhatsAppTripMessenger from '../../components/chat/WhatsAppTripMessenger';

export default function OrganizerGroupsPage() {
  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] font-semibold text-[#420E00]" style={{ fontFamily: 'Inter, sans-serif' }}>
            EXPEDITION COMMUNITIES & MESSENGER
          </p>
          <h1
            className="text-3xl sm:text-4xl font-normal text-[#00261D]"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            Trip Groups Chat
          </h1>
        </div>
        <p className="text-xs text-[#717975] max-w-md text-left sm:text-right">
          Communicate with confirmed travelers across all your published tour packages in real time.
        </p>
      </div>

      <WhatsAppTripMessenger isOrganizer={true} />
    </div>
  );
}

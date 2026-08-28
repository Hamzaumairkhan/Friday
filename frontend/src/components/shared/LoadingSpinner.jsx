export default function LoadingSpinner({ text = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 space-y-4">
      <div className="w-8 h-8 border-3 border-black border-t-transparent rounded-full animate-spin dark:border-white dark:border-t-transparent" />
      {text && (
        <p className="text-sm text-muted-foreground" style={{ fontFamily: 'Inter, sans-serif' }}>
          {text}
        </p>
      )}
    </div>
  );
}

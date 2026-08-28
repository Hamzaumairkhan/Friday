import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import router from './routes/AppRouter';

function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#000000',
            color: '#ffffff',
            borderRadius: '1rem',
            fontFamily: 'Inter, sans-serif',
            fontSize: '13px',
          },
        }}
      />
    </>
  );
}

export default App;

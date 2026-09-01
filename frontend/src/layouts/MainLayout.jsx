import { Outlet } from 'react-router-dom';
import Navbar from '../components/navbar/Navbar';
import Footer from '../components/footer/Footer';
import AuthModal from '../components/auth/AuthModal';
import ScrollToTop from '../components/shared/ScrollToTop';

const MainLayout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAF6] selection:bg-primary/20">
      <ScrollToTop />
      <Navbar />
      <main className="flex-grow pt-[72px]">
        <Outlet />
      </main>
      <Footer />
      {/* Global Auth Modal */}
      <AuthModal />
    </div>
  );
};

export default MainLayout;

import { TopAnnouncementBar } from './TopAnnouncementBar';
import { Header } from './Header';
import { Footer } from './Footer';
import { DrawerCart } from './DrawerCart';
import { FloatingWhatsAppButton } from './FloatingWhatsAppButton';

export function StorefrontShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div>
        <TopAnnouncementBar />
        <Header />
        <main className="w-full max-w-full overflow-hidden">{children}</main>
      </div>
      <DrawerCart />
      <Footer />
      <FloatingWhatsAppButton />
    </>
  );
}

import { BottomNavigation } from "./BottomNavigation";

interface MobileLayoutProps {
  children: React.ReactNode;
}

export function MobileLayout({ children }: MobileLayoutProps) {
  return (
    <div className="mobile-container">
      <div className="mobile-content">
        {children}
      </div>
      <BottomNavigation />
    </div>
  );
}
type IconType = 'briefcase' | 'rocket' | 'brain' | 'settings' | 'compass' | 'coffee' | 'checkmark' | 'shield' | 'lightbulb' | 'target' | 'heart' | 'mail' | 'globe' | 'users' | 'zap' | 'barchart' | 'linechart' | 'cpu' | 'mappin' | 'filecheck' | 'trendingup' | 'send' | 'calendar';

interface AnimatedIconProps {
  children: React.ReactNode;
  delay?: number;
  type?: IconType;
}

export function AnimatedIcon({ children }: AnimatedIconProps) {
  return (
    <span style={{ display: "inline-flex" }}>
      {children}
    </span>
  );
}

import React from 'react';
import { 
  Code2, 
  Shapes, 
  Palette, 
  Video, 
  AudioWaveform, 
  BookOpen, 
  ShieldCheck, 
  Layers, 
  PlayCircle, 
  PenTool, 
  Box, 
  Gamepad2, 
  Package,
  Terminal,
  FileCode
} from 'lucide-react';

interface AppIconProps {
  name: string;
  className?: string;
}

export const AppIcon: React.FC<AppIconProps> = ({ name, className = 'w-6 h-6' }) => {
  switch (name) {
    case 'Code2':
      return <Code2 className={className} />;
    case 'Shapes':
      return <Shapes className={className} />;
    case 'Palette':
      return <Palette className={className} />;
    case 'Video':
      return <Video className={className} />;
    case 'AudioWaveform':
      return <AudioWaveform className={className} />;
    case 'BookOpen':
      return <BookOpen className={className} />;
    case 'ShieldCheck':
      return <ShieldCheck className={className} />;
    case 'Layers':
      return <Layers className={className} />;
    case 'PlayCircle':
      return <PlayCircle className={className} />;
    case 'PenTool':
      return <PenTool className={className} />;
    case 'Box':
      return <Box className={className} />;
    case 'Gamepad2':
      return <Gamepad2 className={className} />;
    case 'Terminal':
      return <Terminal className={className} />;
    case 'FileCode':
      return <FileCode className={className} />;
    default:
      return <Package className={className} />;
  }
};

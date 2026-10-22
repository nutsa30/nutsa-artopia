import React from 'react';

// The painting tools, drawn upright with the working tip at (12, 23.5).
// `paint` colours the part that carries paint (bristles, nozzle); the
// toolbar draws them tilted, the canvas cursor draws them at the pointer.
export const TIP = [12, 23.5];
const wood = { fill: 'currentColor', opacity: .5 }, metal = { fill: 'currentColor', opacity: .85 };

export function ToolGlyph({ id, paint, size = 24, style }) {
  const load = { fill: paint || 'currentColor' };
  const handle = <path d="M10.7 1.3c0-.4.3-.6.6-.6h1.4c.3 0 .6.2.6.6l-.2 9.2h-2.2z" {...wood} />;
  return <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" style={style}>
    {id === 'flat' && <>{handle}<path d="M9.9 10.5h4.2l.5 4.3H9.4z" {...metal} /><path d="M9.4 14.8h5.2l.5 6.5c.1.9-.5 1.7-1.4 1.9-.9.2-2.5.2-3.4 0-.9-.2-1.5-1-1.4-1.9z" {...load} /><path d="M10.6 16v6.4M12 16v6.9M13.4 16v6.4" stroke="#000" strokeOpacity=".18" strokeWidth=".45" /></>}
    {id === 'round' && <>{handle}<path d="M10.3 10.5h3.4l.3 4.3h-4z" {...metal} /><path d="M10 14.8h4c.9 2.1 1 4.4.2 6.3-.5 1.2-1.3 2.1-2.2 2.4-.9-.3-1.7-1.2-2.2-2.4-.8-1.9-.7-4.2.2-6.3z" {...load} /><path d="M11.2 16.2c-.2 2-.1 4 .5 5.8M12.8 16.2c.2 2 .1 4-.5 5.8" fill="none" stroke="#000" strokeOpacity=".18" strokeWidth=".45" /></>}
    {id === 'dry' && <>{handle}<path d="M10.2 10.5h3.6l.4 4.1h-4.4z" {...metal} /><path d="M10 14.6h4l4.4 6c-1.8 1.6-4 2.6-6.4 2.6s-4.6-1-6.4-2.6z" {...load} opacity=".9" /><path d="M12 15v8M10.9 15l-2 7.6M13.1 15l2 7.6M10.3 14.8l-3.6 6.4M13.7 14.8l3.6 6.4" stroke="#000" strokeOpacity=".22" strokeWidth=".5" /></>}
    {id === 'tube' && <><path d="M7.9 1h8.2l-.4 2.4H8.3z" {...metal} /><path d="M8.3 3.4h7.4l-.9 12.8c-.1 1.1-1 1.9-2.1 1.9h-1.4c-1.1 0-2-.8-2.1-1.9z" fill="currentColor" opacity=".7" /><path d="M9 7.2h6l-.3 4.2H9.3z" {...load} /><path d="M10.9 18.1h2.2v2.1h-2.2z" {...metal} /><path d="M11.2 20.2h1.6l-.25 3.3h-1.1z" {...load} /></>}
    {id === 'knife' && <><path d="M10.8 1.1c0-.3.3-.5.6-.5h1.2c.3 0 .6.2.6.5l-.1 7.6h-2.2z" {...wood} /><path d="M10.9 8.7h2.2v1.9h-2.2z" {...metal} /><path d="M11.5 10.6h1l.6 3.6-1 .3z" {...metal} /><path d="M13 14.1c1.9 1 2.6 3.7 1.8 6-.5 1.5-1.5 2.7-2.6 3.4-.5-1.1-.9-2.9-.8-4.8.1-2.3.6-3.9 1.6-4.6z" fill="currentColor" opacity=".9" /><path d="M13 14.6c-.7.8-1 2.3-1.1 4.1" fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth=".45" /></>}
  </svg>;
}

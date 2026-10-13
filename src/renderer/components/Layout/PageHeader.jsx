import React from 'react';
import { T } from '../../theme';

export default function PageHeader({ title, description, badge, actions }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 20,
      flexWrap: 'wrap',
      gap: 12,
    }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <h1 style={{
            fontSize: 22,
            fontWeight: 800,
            color: T.text,
            margin: 0,
            fontFamily: 'Syne, sans-serif',
            letterSpacing: '-0.01em',
            lineHeight: 1.2,
          }}>
            {title}
          </h1>
          {badge}
        </div>
        {description && (
          <p style={{ fontSize: 12, color: T.muted, margin: 0, lineHeight: 1.4 }}>
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {actions}
        </div>
      )}
    </div>
  );
}

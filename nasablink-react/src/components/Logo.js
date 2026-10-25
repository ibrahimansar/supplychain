import React from 'react';

const Logo = ({ size = 48, className = '' }) => (
  <img
  src={`${process.env.PUBLIC_URL}/nasablink.png`}
    alt="NasabLink Logo"
    width={size}
    height={size}
    className={className}
    style={{ display: 'inline-block', objectFit: 'contain', width: size, height: size }}
    draggable={false}
  />
);

export default Logo;

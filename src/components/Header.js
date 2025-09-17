import React from 'react';
import styled from 'styled-components';

const HeaderContainer = styled.div`
  background: rgba(255, 255, 255, 0.95);
  padding: 30px;
  border-radius: 15px;
  margin-bottom: 30px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
  text-align: center;
`;

const Title = styled.h1`
  color: #2c3e50;
  margin: 0 0 10px 0;
  font-size: 2.5em;
`;

const Subtitle = styled.p`
  color: #7f8c8d;
  margin: 0 0 20px 0;
  font-size: 1.2em;
`;

const Header = () => {
  return (
    <HeaderContainer>
      <Title>🚦 Prishtina Traffic Monitoring Dashboard</Title>
      <Subtitle>Real-time traffic sensor data from Prishtina</Subtitle>
    </HeaderContainer>
  );
};

export default Header; 
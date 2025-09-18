import React from 'react';
import styled from 'styled-components';

const HeaderContainer = styled.div`
  padding: 30px;
  border-radius: 15px;
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

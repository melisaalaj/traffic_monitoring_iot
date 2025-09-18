import React from 'react';
import styled from 'styled-components';

const TabsContainer = styled.div`
  display: flex;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 15px 15px 0 0;
  box-shadow: 0 5px 15px rgba(0,0,0,0.1);
  margin-bottom: 0;
`;

const Tab = styled.button`
  flex: 1;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  background: ${props => props.active ? 'white' : '#ecf0f1'};
  border: none;
  font-size: 1.1em;
  font-weight: 600;
  color: ${props => props.active ? '#2c3e50' : '#7f8c8d'};
  transition: all 0.3s ease;
  box-shadow: ${props => props.active ? '0 -3px 10px rgba(0,0,0,0.1)' : 'none'};

  &:hover {
    background: ${props => props.active ? 'white' : '#d5dbdb'};
  }

  &:first-child {
    border-radius: 15px 0 0 0;
  }

  &:last-child {
    border-radius: 0 15px 0 0;
  }
`;

const TabNavigation = ({ activeTab, onTabChange }) => {
  return (
    <TabsContainer>
      <Tab 
        active={activeTab === 'overview'} 
        onClick={() => onTabChange('overview')}
      >
        Overview
      </Tab>
      <Tab 
        active={activeTab === 'visualizations'} 
        onClick={() => onTabChange('visualizations')}
      >
        📊 Data Visualizations
      </Tab>
      <Tab 
        active={activeTab === 'tables'} 
        onClick={() => onTabChange('tables')}
      >
        Data Tables
      </Tab>
      <Tab 
        active={activeTab === 'ml-predictions'} 
        onClick={() => onTabChange('ml-predictions')}
      >
        🤖 AI Predictions
      </Tab>
    </TabsContainer>
  );
};

export default TabNavigation; 
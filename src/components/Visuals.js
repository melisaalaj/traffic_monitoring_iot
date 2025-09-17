import React, { useState } from 'react';
import styled from 'styled-components';
import { BarChart3, Wind, Volume2 } from 'lucide-react';
import TrafficVisuals from './TrafficVisuals';
import AirQualityVisuals from './AirQualityVisuals';
import NoiseVisuals from './NoiseVisuals';

const VisualsContainer = styled.div`
  background: rgba(255, 255, 255, 0.95);
  border-radius: 15px;
  padding: 30px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
  margin: 20px 0;
`;

const VisualsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  flex-wrap: wrap;
  gap: 15px;
`;

const VisualsTitle = styled.h2`
  color: #2c3e50;
  font-size: 1.8em;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const VisualsNav = styled.div`
  display: flex;
  background: #f8f9fa;
  border-radius: 10px;
  padding: 4px;
  gap: 4px;
`;

const VisualTab = styled.button`
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.95em;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  
  background: ${props => props.active ? '#fff' : 'transparent'};
  color: ${props => props.active ? '#2c3e50' : '#7f8c8d'};
  box-shadow: ${props => props.active ? '0 2px 8px rgba(0,0,0,0.1)' : 'none'};

  &:hover {
    background: ${props => props.active ? '#fff' : '#ecf0f1'};
    color: #2c3e50;
  }
`;

const VisualsContent = styled.div`
  min-height: 400px;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #7f8c8d;
`;

const EmptyIcon = styled.div`
  font-size: 4em;
  margin-bottom: 20px;
  opacity: 0.3;
`;

const EmptyTitle = styled.h3`
  font-size: 1.5em;
  margin-bottom: 10px;
  color: #95a5a6;
`;

const EmptyMessage = styled.p`
  font-size: 1.1em;
  max-width: 400px;
  margin: 0 auto;
  line-height: 1.6;
`;

const Visuals = ({ sensors, loading, error }) => {
  const [activeTab, setActiveTab] = useState('traffic');

  const getSensorCount = (type) => {
    if (!sensors) return 0;
    return sensors.filter(s => s.sensor_type === type).length;
  };

  const renderContent = () => {
    if (loading) {
      return (
        <EmptyState>
          <EmptyIcon>⏳</EmptyIcon>
          <EmptyTitle>Loading Visualizations...</EmptyTitle>
          <EmptyMessage>Preparing your sensor data charts and analytics</EmptyMessage>
        </EmptyState>
      );
    }

    if (error) {
      return (
        <EmptyState>
          <EmptyIcon>❌</EmptyIcon>
          <EmptyTitle>Error Loading Data</EmptyTitle>
          <EmptyMessage>{error}</EmptyMessage>
        </EmptyState>
      );
    }

    if (!sensors || sensors.length === 0) {
      return (
        <EmptyState>
          <EmptyIcon>📊</EmptyIcon>
          <EmptyTitle>No Sensor Data Available</EmptyTitle>
          <EmptyMessage>
            Waiting for sensor data to generate visualizations. 
            Make sure your sensors are active and sending data.
          </EmptyMessage>
        </EmptyState>
      );
    }

    const filteredSensors = sensors.filter(s => {
      switch(activeTab) {
        case 'traffic': return s.sensor_type === 'traffic_loop';
        case 'air': return s.sensor_type === 'air_quality';
        case 'noise': return s.sensor_type === 'noise';
        default: return false;
      }
    });

    if (filteredSensors.length === 0) {
      return (
        <EmptyState>
          <EmptyIcon>
            {activeTab === 'traffic' ? '🚗' : activeTab === 'air' ? '🌬️' : '🔊'}
          </EmptyIcon>
          <EmptyTitle>No {activeTab === 'traffic' ? 'Traffic' : activeTab === 'air' ? 'Air Quality' : 'Noise'} Data</EmptyTitle>
          <EmptyMessage>
            No {activeTab === 'traffic' ? 'traffic' : activeTab === 'air' ? 'air quality' : 'noise'} sensors 
            are currently active or have data available.
          </EmptyMessage>
        </EmptyState>
      );
    }

    switch(activeTab) {
      case 'traffic':
        return <TrafficVisuals sensors={sensors} />;
      case 'air':
        return <AirQualityVisuals sensors={sensors} />;
      case 'noise':
        return <NoiseVisuals sensors={sensors} />;
      default:
        return null;
    }
  };

  return (
    <VisualsContainer>
      <VisualsHeader>
        <VisualsTitle>
          <BarChart3 size={24} />
          Data Visualizations
        </VisualsTitle>
        
        <VisualsNav>
          <VisualTab 
            active={activeTab === 'traffic'} 
            onClick={() => setActiveTab('traffic')}
          >
            <BarChart3 size={16} />
            Traffic ({getSensorCount('traffic_loop')})
          </VisualTab>
          <VisualTab 
            active={activeTab === 'air'} 
            onClick={() => setActiveTab('air')}
          >
            <Wind size={16} />
            Air Quality ({getSensorCount('air_quality')})
          </VisualTab>
          <VisualTab 
            active={activeTab === 'noise'} 
            onClick={() => setActiveTab('noise')}
          >
            <Volume2 size={16} />
            Noise ({getSensorCount('noise')})
          </VisualTab>
        </VisualsNav>
      </VisualsHeader>

      <VisualsContent>
        {renderContent()}
      </VisualsContent>
    </VisualsContainer>
  );
};

export default Visuals; 
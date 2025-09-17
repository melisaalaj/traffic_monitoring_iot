import React from 'react';
import styled from 'styled-components';

const StatsContainer = styled.div`
  background: rgba(255, 255, 255, 0.95);
  padding: 25px;
  border-radius: 15px;
  margin-bottom: 20px;
  box-shadow: 0 5px 15px rgba(0,0,0,0.1);
`;

const StatsTitle = styled.div`
  color: #2c3e50;
  font-size: 1.5em;
  font-weight: 600;
  margin-bottom: 20px;
  text-align: center;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
`;

const StatCard = styled.div`
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 3px 10px rgba(0,0,0,0.1);
  text-align: center;
  border-left: 4px solid ${props => {
    switch(props.type) {
      case 'traffic': return '#f39c12';
      case 'air': return '#27ae60';
      case 'noise': return '#e74c3c';
      default: return '#3498db';
    }
  }};
`;

const CardTitle = styled.h3`
  color: #2c3e50;
  margin: 0 0 15px 0;
  font-size: 1.2em;
`;

const StatMetric = styled.div`
  margin: 8px 0;
  padding: 5px 0;
`;

const StatLabel = styled.span`
  color: #7f8c8d;
  font-size: 0.9em;
  font-weight: 500;
`;

const StatValue = styled.span`
  color: #2c3e50;
  font-size: 1.3em;
  font-weight: 600;
  margin-left: 8px;
`;

const formatNumber = (value) => {
  if (value === null || value === undefined || value === '-') {
    return '-';
  }
  if (typeof value === 'number') {
    return value.toFixed(2);
  }
  return value;
};

const StatisticsSection = ({ statistics }) => {
  if (!statistics) return null;

  return (
    <StatsContainer>
      <StatsTitle>📊 Overall Statistics</StatsTitle>
      <StatsGrid>
        <StatCard type="traffic">
          <CardTitle>🚗 Traffic Sensors ({statistics.traffic.count})</CardTitle>
          <StatMetric>
            <StatLabel>Avg Vehicles/min:</StatLabel>
            <StatValue>{formatNumber(statistics.traffic.vehicle_count_avg)}</StatValue>
          </StatMetric>
          <StatMetric>
            <StatLabel>Avg Speed:</StatLabel>
            <StatValue>{formatNumber(statistics.traffic.speed_avg)} km/h</StatValue>
          </StatMetric>
          <StatMetric>
            <StatLabel>Avg Wait Time:</StatLabel>
            <StatValue>{formatNumber(statistics.traffic.wait_time_avg)} sec</StatValue>
          </StatMetric>
        </StatCard>

        <StatCard type="air">
          <CardTitle>🌬️ Air Quality Sensors ({statistics.air_quality.count})</CardTitle>
          <StatMetric>
            <StatLabel>Avg PM2.5:</StatLabel>
            <StatValue>{formatNumber(statistics.air_quality.pm25_avg)} μg/m³</StatValue>
          </StatMetric>
          <StatMetric>
            <StatLabel>Avg Temperature:</StatLabel>
            <StatValue>{formatNumber(statistics.air_quality.temp_avg)} °C</StatValue>
          </StatMetric>
        </StatCard>

        <StatCard type="noise">
          <CardTitle>🔊 Noise Sensors ({statistics.noise.count})</CardTitle>
          <StatMetric>
            <StatLabel>Avg Noise Level:</StatLabel>
            <StatValue>{formatNumber(statistics.noise.noise_avg)} dB</StatValue>
          </StatMetric>
        </StatCard>
      </StatsGrid>
    </StatsContainer>
  );
};

export default StatisticsSection; 
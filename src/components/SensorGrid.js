import React from 'react';
import styled from 'styled-components';
import MLIndicator from './MLIndicator';

const GridContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 15px;
  max-height: 500px;
  overflow-y: auto;
`;

const SensorCard = styled.div`
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 3px 10px rgba(0,0,0,0.1);
  border-left: 4px solid ${props => {
    switch(props.type) {
      case 'traffic_loop': return '#f39c12';
      case 'air_quality': return '#27ae60';
      case 'noise': return '#e74c3c';
      default: return '#3498db';
    }
  }};
  cursor: pointer;
  transition: all 0.3s ease;
  transform: ${props => props.selected ? 'translateY(-2px)' : 'translateY(0)'};
  box-shadow: ${props => props.selected 
    ? '0 5px 20px rgba(52, 152, 219, 0.4)' 
    : '0 3px 10px rgba(0,0,0,0.1)'
  };
  position: relative;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 20px rgba(0,0,0,0.15);
  }
`;

const SensorTitle = styled.h3`
  color: #2c3e50;
  margin: 0 0 12px 0;
  font-size: 1.2em;
`;

const SensorMetric = styled.div`
  display: flex;
  justify-content: space-between;
  margin: 8px 0;
  padding: 6px 0;
  border-bottom: 1px solid #ecf0f1;
  font-size: 0.9em;

  &:last-child {
    border-bottom: none;
  }
`;

const MetricLabel = styled.span`
  color: #7f8c8d;
  font-weight: 500;
`;

const MetricValue = styled.span`
  color: #2c3e50;
  font-weight: 600;
`;

const getSensorEmoji = (sensorType) => {
  switch(sensorType) {
    case 'traffic_loop': return '🚗';
    case 'air_quality': return '🌬️';
    case 'noise': return '🔊';
    default: return '📍';
  }
};

const formatNumber = (value) => {
  if (value === null || value === undefined || value === '-') {
    return '-';
  }
  if (typeof value === 'number') {
    return value.toFixed(2);
  }
  return value;
};

const SensorGrid = ({ sensors, selectedSensor, onSensorSelect }) => {
  return (
    <GridContainer>
      {sensors.map(sensor => {
        const emoji = getSensorEmoji(sensor.sensor_type);
        const isSelected = selectedSensor === sensor.sensor_id;

        return (
          <SensorCard
            key={sensor.sensor_id}
            type={sensor.sensor_type}
            selected={isSelected}
            onClick={() => onSensorSelect(sensor.sensor_id)}
          >
            <MLIndicator 
              sensorId={sensor.sensor_id} 
              sensorType={sensor.sensor_type === 'traffic_loop' ? 'traffic' : sensor.sensor_type}
            />
            <SensorTitle>
              {emoji} {sensor.sensor_id}
            </SensorTitle>

            {sensor.sensor_type === 'traffic_loop' && (
              <>
                <SensorMetric>
                  <MetricLabel>Vehicles/min:</MetricLabel>
                  <MetricValue>{formatNumber(sensor.vehicle_count_per_min)}</MetricValue>
                </SensorMetric>
                <SensorMetric>
                  <MetricLabel>Avg Speed:</MetricLabel>
                  <MetricValue>{formatNumber(sensor.avg_speed_kmh)} km/h</MetricValue>
                </SensorMetric>
                <SensorMetric>
                  <MetricLabel>Wait Time:</MetricLabel>
                  <MetricValue>{formatNumber(sensor.avg_wait_time_s)} sec</MetricValue>
                </SensorMetric>
              </>
            )}

            {sensor.sensor_type === 'air_quality' && (
              <>
                <SensorMetric>
                  <MetricLabel>PM2.5:</MetricLabel>
                  <MetricValue>{formatNumber(sensor.pm25)} μg/m³</MetricValue>
                </SensorMetric>
                <SensorMetric>
                  <MetricLabel>Temperature:</MetricLabel>
                  <MetricValue>{formatNumber(sensor.temp_c)} °C</MetricValue>
                </SensorMetric>
              </>
            )}

            {sensor.sensor_type === 'noise' && (
              <SensorMetric>
                <MetricLabel>Noise:</MetricLabel>
                <MetricValue>{formatNumber(sensor.noise_db)} dB</MetricValue>
              </SensorMetric>
            )}
          </SensorCard>
        );
      })}
    </GridContainer>
  );
};

export default SensorGrid; 
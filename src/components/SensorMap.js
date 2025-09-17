import React, { useEffect } from 'react';
import styled from 'styled-components';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const MapContainer_Styled = styled.div`
  background: white;
  border-radius: 15px;
  box-shadow: 0 5px 15px rgba(0,0,0,0.1);
  overflow: hidden;
`;

const MapHeader = styled.div`
  background: #34495e;
  color: white;
  padding: 15px 20px;
  font-weight: 600;
  font-size: 1.1em;
`;

const MapWrapper = styled.div`
  height: 500px;
  width: 100%;
`;

const getSensorIcon = (sensorType) => {
  let color = '#3498db';
  let emoji = '📍';
  
  if (sensorType === 'traffic_loop') {
    color = '#f39c12';
    emoji = '🚗';
  } else if (sensorType === 'air_quality') {
    color = '#27ae60';
    emoji = '🌬️';
  } else if (sensorType === 'noise') {
    color = '#e74c3c';
    emoji = '🔊';
  }
  
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="
      background-color: ${color};
      width: 25px;
      height: 25px;
      border-radius: 50%;
      border: 2px solid white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.3);
    ">${emoji}</div>`,
    iconSize: [25, 25],
    iconAnchor: [12, 12]
  });
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

const MapController = ({ sensors, selectedSensor }) => {
  const map = useMap();

  useEffect(() => {
    if (selectedSensor && sensors.length === 1) {
      // Zoom to selected sensor
      const sensor = sensors[0];
      map.setView([sensor.lat, sensor.lon], 15);
    } else if (sensors.length > 1) {
      // Fit bounds to show all sensors
      if (sensors.length > 0) {
        const bounds = L.latLngBounds(sensors.map(sensor => [sensor.lat, sensor.lon]));
        map.fitBounds(bounds, { padding: [20, 20] });
      } else {
        // Default view of Prishtina
        map.setView([42.6629, 21.1655], 12);
      }
    }
  }, [map, sensors, selectedSensor]);

  return null;
};

const SensorMap = ({ sensors, selectedSensor, onSensorSelect }) => {
  return (
    <MapContainer_Styled>
      <MapHeader>
        📍 {sensors.length} Sensor Location{sensors.length !== 1 ? 's' : ''} in Prishtina
      </MapHeader>
      <MapWrapper>
        <MapContainer
          center={[42.6629, 21.1655]}
          zoom={12}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          <MapController sensors={sensors} selectedSensor={selectedSensor} />
          
          {sensors.map(sensor => (
            <Marker
              key={sensor.sensor_id}
              position={[sensor.lat, sensor.lon]}
              icon={getSensorIcon(sensor.sensor_type)}
              eventHandlers={{
                click: () => onSensorSelect(sensor.sensor_id)
              }}
            >
              <Popup>
                <div style={{ fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif' }}>
                  <div style={{ fontWeight: '600', color: '#2c3e50', marginBottom: '5px' }}>
                    {sensor.sensor_type === 'traffic_loop' ? '🚗' : 
                     sensor.sensor_type === 'air_quality' ? '🌬️' : '🔊'} {sensor.sensor_id}
                  </div>
                  
                  {sensor.sensor_type === 'traffic_loop' && (
                    <div>
                      <div style={{ margin: '3px 0', fontSize: '0.9em' }}>
                        Vehicles/min: {formatNumber(sensor.vehicle_count_per_min)}
                      </div>
                      <div style={{ margin: '3px 0', fontSize: '0.9em' }}>
                        Avg Speed: {formatNumber(sensor.avg_speed_kmh)} km/h
                      </div>
                      <div style={{ margin: '3px 0', fontSize: '0.9em' }}>
                        Wait Time: {formatNumber(sensor.avg_wait_time_s)} sec
                      </div>
                    </div>
                  )}
                  
                  {sensor.sensor_type === 'air_quality' && (
                    <div>
                      <div style={{ margin: '3px 0', fontSize: '0.9em' }}>
                        PM2.5: {formatNumber(sensor.pm25)} μg/m³
                      </div>
                      <div style={{ margin: '3px 0', fontSize: '0.9em' }}>
                        Temperature: {formatNumber(sensor.temp_c)} °C
                      </div>
                    </div>
                  )}
                  
                  {sensor.sensor_type === 'noise' && (
                    <div>
                      <div style={{ margin: '3px 0', fontSize: '0.9em' }}>
                        Noise: {formatNumber(sensor.noise_db)} dB
                      </div>
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </MapWrapper>
    </MapContainer_Styled>
  );
};

export default SensorMap; 
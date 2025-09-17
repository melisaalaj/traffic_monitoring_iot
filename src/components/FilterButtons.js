import React from 'react';
import styled from 'styled-components';
import { X } from 'lucide-react';

const FilterContainer = styled.div`
  margin-bottom: 20px;
  text-align: center;
`;

const FilterButton = styled.button`
  padding: 8px 16px;
  margin: 0 5px;
  border: 2px solid #3498db;
  background: ${props => props.active ? '#3498db' : 'white'};
  color: ${props => props.active ? 'white' : '#3498db'};
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 500;

  &:hover {
    background: #2980b9;
    color: white;
    border-color: #2980b9;
  }
`;

const ClearButton = styled.button`
  padding: 8px 16px;
  margin: 0 5px;
  border: 2px solid #e74c3c;
  background: #e74c3c;
  color: white;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 500;
  display: ${props => props.show ? 'inline-flex' : 'none'};
  align-items: center;
  gap: 4px;

  &:hover {
    background: #c0392b;
    border-color: #c0392b;
  }
`;

const FilterButtons = ({ sensorFilter, selectedSensor, onFilterChange, onClearSelection }) => {
  return (
    <FilterContainer>
      <FilterButton 
        active={sensorFilter === 'all' && !selectedSensor}
        onClick={() => onFilterChange('all')}
      >
        All (60)
      </FilterButton>
      <FilterButton 
        active={sensorFilter === 'traffic_loop' && !selectedSensor}
        onClick={() => onFilterChange('traffic_loop')}
      >
        Traffic (20)
      </FilterButton>
      <FilterButton 
        active={sensorFilter === 'air_quality' && !selectedSensor}
        onClick={() => onFilterChange('air_quality')}
      >
        Air Quality (20)
      </FilterButton>
      <FilterButton 
        active={sensorFilter === 'noise' && !selectedSensor}
        onClick={() => onFilterChange('noise')}
      >
        Noise (20)
      </FilterButton>
      <ClearButton 
        show={selectedSensor}
        onClick={onClearSelection}
      >
        <X size={14} />
        Clear Selection
      </ClearButton>
    </FilterContainer>
  );
};

export default FilterButtons; 
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import { useReducer } from 'react';
import CellCountIndicator from './CellCountIndicator';
import CellGrid from './CellGrid';
import CellTypeCheckbox from './CellTypeCheckbox';
import CellTypeOpacitySlider from './CellTypeOpacitySlider';
import ColorIndicator from './ColorIndicator';
import EditDeleteMenu from './EditDeleteMenu';
import EditNameField from './EditNameField';

const rowStyle = {
  boxShadow: 2,
  marginTop: 1,
  marginBottom: 1,
};

const accordionSummaryStyle = {
  marginBottom: -5,
};

function CellTypeAccordion(props) {
  const { cellType, expanded, setExpanded, toggleArray, setToggleArray } = props;

  const [openColor, toggleColor] = useReducer((v) => !v, false);

  // Event handler for expanding accordion
  const handleChange = (panel) => (event, isExpanded) => {
    setExpanded(isExpanded ? panel : false);
  };

  // Togglers for text field edits
  const [typing, toggleType] = useReducer((v) => !v, false);

  return (
    <Accordion
      sx={rowStyle}
      expanded={expanded === cellType.id}
      onChange={handleChange(cellType.id)}
    >
      <AccordionSummary style={accordionSummaryStyle}>
        {/* Toggle view of Cell Type with checkbox*/}
        <CellTypeCheckbox
          id={cellType.id}
          color={cellType.color}
          openColor={openColor}
          toggleArray={toggleArray}
          setToggleArray={setToggleArray}
        />

        {/* Slider for cell type opacity on canvas */}
        <CellTypeOpacitySlider id={cellType.id} color={cellType.color} />

        {/* Indicator for how many cells are in a given cell type label */}
        <CellCountIndicator id={cellType.id} />

        {/* Editable cell type name */}
        <EditNameField
          id={cellType.id}
          cellName={cellType.name}
          typing={typing}
          toggleType={toggleType}
        />

        {/* Editable color symbol for cell type */}
        <ColorIndicator
          id={cellType.id}
          color={cellType.color}
          openColor={openColor}
          toggleColor={toggleColor}
        />

        {/* Options button to open menu for name edit and delete */}
        <EditDeleteMenu
          id={cellType.id}
          toggleType={toggleType}
          toggleArray={toggleArray}
          setToggleArray={setToggleArray}
        />
      </AccordionSummary>
      <AccordionDetails>
        {/* Grid of cells to add and remove from cell type */}
        <CellGrid id={cellType.id} name={cellType.name} />
      </AccordionDetails>
    </Accordion>
  );
}

export default CellTypeAccordion;

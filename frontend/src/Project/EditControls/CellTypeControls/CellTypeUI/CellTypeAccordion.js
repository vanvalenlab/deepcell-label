import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import { useReducer } from 'react';
import CellGrid from './CellGrid';
import ColorIndicator from './ColorIndicator';
import EditDeleteMenu from './EditDeleteMenu';
import EditNameField from './EditNameField';

const rowStyle = {
    boxShadow: 1,
    marginTop: 1,
    marginBottom: 1,
};

const accordionSummaryStyle = {
    marginBottom: -5,
}

function CellTypeAccordion(props) {
    const { cellType, expanded, setExpanded } = props;

    // Event handler for expanding accordion
    const handleChange = (panel) => (event, isExpanded) => {
        setExpanded(isExpanded ? panel : false);
    };

    // Togglers for text field edits
    const [typing, toggleType] = useReducer((v) => !v, false);

    return (
        <Accordion sx={rowStyle} expanded={expanded === cellType.id} onChange={handleChange(cellType.id)}>
            <AccordionSummary style={accordionSummaryStyle}>
                {/* Editable color symbol for cell type */}
                <ColorIndicator id={cellType.id} color={cellType.color}/>

                {/* Editable cell type name */}
                <EditNameField id={cellType.id} cellName={cellType.name} typing={typing} toggleType={toggleType} />

                {/* Options button to open menu for name edit and delete */}
                <EditDeleteMenu id={cellType.id} toggleType={toggleType} />
            </AccordionSummary>
            <AccordionDetails>
                {/* Grid of cells to add and remove from cell type */}
                <CellGrid id={cellType.id} color={cellType.color} name={cellType.name} cells={cellType.cells}/>
            </AccordionDetails>
        </Accordion>
    )
}

export default CellTypeAccordion;
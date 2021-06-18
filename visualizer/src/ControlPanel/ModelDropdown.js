import FormControl from '@material-ui/core/FormControl';
import MenuItem from '@material-ui/core/MenuItem';
import Select from '@material-ui/core/Select';
import axios from 'axios';
import { PropTypes } from 'prop-types';
import React, { useState, useEffect } from 'react';

export default function ModelDropdown(props) {
  const { value, onChange, onError } = props;

  const [isOpen, setIsOpen] = useState(false);
  const [allJobTypes, setAllJobTypes] = useState([]);

  const getAllJobTypes = () => {
    axios({
      method: 'get',
      url: 'https://deepcell.org/api/jobtypes',
    })
      .then(response => {
        setAllJobTypes(response.data.jobTypes);
        onChange(response.data.jobTypes[0]);
      })
      .catch(error => {
        onError(`Failed to get job types due to error: ${error}`);
      });
  };

  useEffect(() => getAllJobTypes(), [0]);

  return (
    <FormControl>
      <Select
        open={isOpen}
        onClose={() => setIsOpen(false)}
        onOpen={() => setIsOpen(true)}
        onChange={e => onChange(e.target.value)}
        value={value}
        style={{ textTransform: 'capitalize' }}
      >
        {allJobTypes.map(job => (
          <MenuItem
            value={job}
            style={{ textTransform: 'capitalize' }}
            key={allJobTypes.indexOf(job)}
          >
            {job}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

ModelDropdown.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func,
  onError: PropTypes.func,
};

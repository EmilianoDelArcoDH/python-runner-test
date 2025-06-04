import React from 'react';
import PropTypes from 'prop-types';
import './BorderRight.css';

const BorderRight = ({ mode }) => {
  // URL de la documentación de Python
  const pythonDocsUrl = 'https://docs.python.org/es/3/tutorial/';

  // Clase para alternar estilos entre claro y oscuro
  const themeClass = mode === 'dark' ? 'dark-mode' : 'light-mode';

  return (
    <div className={`border-right-container ${themeClass}`}> 
      <div className="iframe-container">
        <iframe
          src={pythonDocsUrl}
          title="Python Documentation"
          width="100%"
          height="100%"
          frameBorder="0"
        />
      </div>
    </div>
  );
};

BorderRight.propTypes = {
  mode: PropTypes.oneOf(['light', 'dark']).isRequired,
};

export default BorderRight;

import React from 'react';
import Helmet from 'react-helmet';
import PropTypes from 'prop-types';

import Header from '../Header';
import Footer from '../Footer';
import * as styles from './Layout.module.css';

// CSS not modular here to provide global styles
import './Globals.css';

const Layout = ({ props, children, disablePaddingBottom = false }) => {
  return (
    <>
      <Helmet>
        {/* Add any sitewide scripts here */}
        <link
          rel="stylesheet"
          type="text/css"
          href="https://cdnjs.cloudflare.com/ajax/libs/slick-carousel/1.6.0/slick-theme.min.css"
        />
        <link
          rel="stylesheet"
          type="text/css"
          charset="UTF-8"
          href="https://cdnjs.cloudflare.com/ajax/libs/slick-carousel/1.6.0/slick.min.css"
        />
        {/* <script>
          {`	let __GOZEN_NOTIFY__ = {
				debug: true
			}`}
        </script>
        <script
          src="https://dev-notify-render-engine.netlify.app/embedTest.js"
          id="gozen-notify-campaign"
          data-campaign="6ce4fa6b-4a64-4a2b-9ea5-976af258202c"
        ></script> */}

        <script>
          {`	let __GOZEN_NOTIFY__ = {
				debug: true
			}`}
        </script>

        <script
          src="https://dev-notify-render-engine.netlify.app/embed.js"
          id="gozen-notify-campaign"
          data-campaign="497334d0-18d8-4e70-80c9-159626a7a82c"
        ></script>
      </Helmet>

      <Header />
      <main
        className={`${styles.main} ${
          disablePaddingBottom === true ? styles.disablePaddingBottom : ''
        }`}
      >
        {children}
      </main>
      <Footer />
    </>
  );
};

Layout.propTypes = {
  children: PropTypes.node.isRequired,
};

export default Layout;

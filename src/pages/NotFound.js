import React from 'react';
import CustomError from './CustomError';

class NotFound extends React.Component {
  render() {
    return <CustomError Title="Error 404" Title2="Page not found :(" Text=" Maybe the page you are looking for has been removed, or you typed in the wrong URL"/>;
  }
}

export default NotFound;
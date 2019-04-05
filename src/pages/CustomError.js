import React from 'react';
import Layout from './Layout';
import Card from '@material-ui/core/Card';
import CardHeader from '@material-ui/core/CardHeader';
import { CardContent } from '@material-ui/core';
import Typography from '@material-ui/core/Typography';
import CardActions from '@material-ui/core/CardActions';
import { Link } from 'react-router-dom';
import Button from '@material-ui/core/Button';

class CustomError extends React.Component {
  constructor(props) {
    super(props);
    this.goBack = this.goBack.bind(this);
  }

  goBack() {
    if (this.props.history) {
      this.props.history.goBack();
    }
  }

  render() {
    let goBackButton = null;
    if (this.props.history) {
      goBackButton = (
        <Button size="small" color="primary" onClick={this.goBack}>
          Go Back
          </Button>
      );
    }
    return (
      <Layout Title={this.props.Title}>
        <Card>
          <CardHeader title={this.props.Title2} />
          <CardContent>
            <Typography component="p">{this.props.Text}</Typography>
          </CardContent>
          <CardActions>
            <Button size="small" color="primary" component={Link} to="/">
              Go To Homepage
            </Button>
            {goBackButton}
          </CardActions>
        </Card>
      </Layout>
    );
  }
}

export default CustomError;
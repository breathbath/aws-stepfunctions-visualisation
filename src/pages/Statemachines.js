import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';
import { Link } from 'react-router-dom';
import Layout from './Layout';
import CustomError from './CustomError';
import CircularProgress from '@material-ui/core/CircularProgress';

const styles = theme => ({
  root: {
    width: '100%',
    marginTop: theme.spacing.unit * 1,
    overflowX: 'auto',
  },
  table: {
    minWidth: 700,
  },
  progress: {
    margin: theme.spacing.unit * 2,
  },
});

class Statemachines extends React.Component {
  constructor(props) {
    super(props);
    this.classes = props;
    this.state = {
      error: null,
      isLoaded: false,
      items: []
    };
  }

  componentDidMount() {
    fetch(process.env.REACT_APP_DEV_API_URL, {
      method: "POST",
      headers: {
        'X-Amz-Target': 'AWSStepFunctions.ListStateMachines'
      },
      body: JSON.stringify({
        maxResults: 1000
      })
    }).then(res => res.json())
      .then(
        (result) => {
          this.setState({
            isLoaded: true,
            items: result.stateMachines
          });
        },
        // Note: it's important to handle errors here
        // instead of a catch() block so that we don't swallow
        // exceptions from actual bugs in components.
        (error) => {
          console.log(error);
          this.setState({
            isLoaded: true,
            error
          });
        }
      )
  }

  render() {
    const { error, isLoaded, items } = this.state;
    if (error) {
      return <CustomError Title="Exception" Title2="Sometheing went wrong :(" Text="Page is broken" />;
    }
    let content;
    if (!isLoaded) {
      content = <div className={this.classes.progressContainer}><CircularProgress className={this.classes.progress} /></div>;
    } else {
      content = (
        <Paper className={this.classes.root}>
          <Table className={this.classes.table}>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Arn</TableCell>
                <TableCell>Creation Date</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map(item => (
                <TableRow key={item.stateMachineArn}>
                  <TableCell component="th" scope="row">
                    <Link to={"/sm/" + item.stateMachineArn}>{item.name}</Link>
                  </TableCell>
                  <TableCell>
                    <Link to={"/sm/" + item.stateMachineArn}>{item.stateMachineArn}</Link>
                  </TableCell>
                  <TableCell>{item.creationDate}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      );
    }
    return (
      <Layout Title="State Machines">
        {content}
      </Layout>
    );
  }
}

Statemachines.propTypes = {
  classes: PropTypes.object.isRequired,
};

export let Title = "Statemachines"

export default withStyles(styles)(Statemachines);
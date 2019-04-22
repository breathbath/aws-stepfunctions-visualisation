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
import Card from '@material-ui/core/Card';
import CardActions from '@material-ui/core/CardActions';
import Button from '@material-ui/core/Button';
import Chip from '@material-ui/core/Chip';
import {fetchAwsWithErrorHandling} from '../components/AwsFetcher';

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
  chip: {
    margin: theme.spacing.unit,
  },
});

class Statemachine extends React.Component {
  constructor(props) {
    super(props);
    this.classes = props;
    this.state = {
      error: null,
      isLoaded: false,
      items: [],
      stateMachine:{}
    };
  }

  componentDidMount() {
    let stateMachine = {};
    fetchAwsWithErrorHandling(
      "DescribeStateMachine",
      {
        stateMachineArn: this.props.match.params['id']
      },
      this,
      (result) => {
        if (result.name === undefined) {
          return "Invalid server response, missing 'name' key in DescribeStateMachine action output";
        }
        stateMachine = result;
        fetchAwsWithErrorHandling(
          "ListExecutions",
          {
            maxResults: 1000,
            stateMachineArn: this.props.match.params['id']
          },
          this,
          (result) => {
            if (!result.executions) {
              return "Invalid server response, missing 'executions' key in ListExecutions action output";
            }
            this.setState({
              isLoaded: true,
              items: result.executions,
              stateMachine: stateMachine
            });
          }
        )
      }
    )
  }

  render() {
    const { error, isLoaded, items } = this.state;
    if (error) {
      return <CustomError Title="Exception" Title2="Sometheing went wrong :(" Text={error} />;
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
                <TableCell>Execution Arn</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Start Date</TableCell>
                <TableCell>Stop Date</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item, key) => (
                <TableRow key={item.executionArn + key}>
                  <TableCell component="th" scope="row">
                    <Link to={"/sm/" + item.stateMachineArn + "/e/" + item.executionArn}>{item.executionArn}</Link>
                  </TableCell>
                  <TableCell>
                    <Link to={"/sm/" + item.stateMachineArn + "/e/" + item.executionArn}>{item.name}</Link>
                  </TableCell>
                  <TableCell>
                    <div className={this.classes.root}>
                      <Chip label={item.status} className={this.classes.chip} color={item.status === "SUCCEEDED" ? "primary": "secondary"} />
                    </div>
                  </TableCell>
                  <TableCell>
                    {item.startDate}
                  </TableCell>
                  <TableCell>
                    {item.stopDate}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Card>
            <CardActions>
              <Button size="small" color="primary" component={Link} to="/">
                Back
              </Button>
            </CardActions>
          </Card>
        </Paper>
      );
    }

    return (
      <Layout Title={"State Machine: [" + this.state.stateMachine.name + "]"}>
        {content}
      </Layout>
    );
  }
}

Statemachine.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(Statemachine);
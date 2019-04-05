import React from 'react';
import Layout from './Layout';
import Card from '@material-ui/core/Card';
import CardHeader from '@material-ui/core/CardHeader';
import { CardContent } from '@material-ui/core';
import CardActions from '@material-ui/core/CardActions';
import { Link } from 'react-router-dom';
import Button from '@material-ui/core/Button';
import { withStyles } from '@material-ui/core/styles';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import CustomError from './CustomError';
import CircularProgress from '@material-ui/core/CircularProgress';
import NotFound from './NotFound';
import Graph from './Graph';

const styles = theme => ({
    root: {
        flexGrow: 1,
    },
    paper: {
        padding: theme.spacing.unit * 2,
        textAlign: 'center',
        color: theme.palette.text.secondary,
    },
    progress: {
        margin: theme.spacing.unit * 2,
    },
});

class ExecutionDetails extends React.Component {
    constructor(props) {
        super(props);
        this.stateMachineArn = this.props.match.params['id'];
        this.executionArn = this.props.match.params['eid'];
        this.stateId = this.props.match.params['sid'];
        this.classes = props;
        this.state = {
            error: null,
            isLoaded: false,
            executionDetails: { name: '' },
            stateMachineDetails: { name: '' },
        };
    }
    componentDidMount() {
        if (!this.executionArn || !this.stateMachineArn) {
            return;
        }
        let executionDetails = {};
        fetch(
            process.env.REACT_APP_DEV_API_URL,
            {
                method: "POST",
                headers: {
                    'X-Amz-Target': 'AWSStepFunctions.DescribeExecution'
                },
                body: JSON.stringify({
                    executionArn: this.props.match.params['eid']
                })
            }
        ).then(res => res.json())
            .then((result) => {
                    if (result.error) {
                        console.log(result.error);
                        this.setState({
                            isLoaded: true,
                            error: result.error
                        });
                        return;
                    }
                    executionDetails = result;
                    fetch(
                        process.env.REACT_APP_DEV_API_URL,
                        {
                            method: "POST",
                            headers: {
                                'X-Amz-Target': 'AWSStepFunctions.DescribeStateMachineForExecution'
                            },
                            body: JSON.stringify({
                                executionArn: this.props.match.params['eid']
                            })
                        }
                    ).then(res => res.json())
                        .then(
                            (result) => {
                                if (result.error) {
                                    console.log(result.error);
                                    this.setState({
                                        isLoaded: true,
                                        error: result.error
                                    });
                                    return;
                                }
                                this.setState({
                                    isLoaded: true,
                                    stateMachineDetails: result,
                                    executionDetails: executionDetails
                                });
                            },
                            (error) => {
                                console.log(error);
                                this.setState({
                                    error
                                });
                            }
                        )
                },
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
        if (!this.executionArn || !this.stateMachineArn) {
            return <NotFound />;
        }

        const { error, isLoaded, executionDetails, stateMachineDetails } = this.state;
        if (error) {
            return <CustomError Title="Error" Title2="Cannot fetch data from the remote server :(" Text="Bad gateway" />;
        }

        if (!isLoaded) {
            return (
                <Layout Title={"Execution Details"}>
                    <div><CircularProgress className={this.classes.progress} /></div>
                </Layout>
            );
        }

        let ren = (
            <Layout Title={"Execution Details"}>
                <div className={this.classes.root}>
                    <Grid container spacing={16}>
                        <Grid item xs>
                            <Card>
                                <CardActions>
                                    <Button size="small" color="primary" component={Link} to="/">
                                        Home
                                    </Button>
                                    <Button size="small" color="primary" component={Link} to={"/sm/" + this.stateMachineArn}>
                                        Back to State Machine
                                    </Button>
                                </CardActions>
                            </Card>
                        </Grid>
                    </Grid>
                    <Grid container spacing={16}>
                        <Grid item xs>
                            <Card className={this.classes.card}>
                                <CardContent>
                                    <Typography variant="h5" gutterBottom>
                                        Execution: {executionDetails.name} (State Machine: {stateMachineDetails.name})
                                    </Typography>
                                    <Grid container spacing={32}>
                                        <Grid item xs={4}>
                                            <Card className={this.classes.card}>
                                                <CardHeader title="Input" />
                                                <CardContent>
                                                    <Typography component="p">
                                                        {executionDetails.input}
                                                    </Typography>
                                                </CardContent>
                                            </Card>
                                        </Grid>
                                        <Grid item xs={4}>
                                            <Card className={this.classes.card}>
                                                <CardHeader title="Output" />
                                                <CardContent>
                                                    <Typography component="p">{executionDetails.output}</Typography>
                                                </CardContent>
                                            </Card>
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                    <Graph executionArn={this.executionArn} stateId={this.stateId} stateMachineArn={this.stateMachineArn} classes={this.classes} />
                </div>
                <Grid container spacing={16}>
                    <Grid item xs>
                        <Card>
                            <CardActions>
                                <Button size="small" color="primary" component={Link} to="/">
                                    Home
                                 </Button>
                                <Button size="small" color="primary" component={Link} to="/">
                                    Back to State Machine
                                 </Button>
                            </CardActions>
                        </Card>
                    </Grid>
                </Grid>
            </Layout>
        );
        return ren;
    }
}

export default withStyles(styles)(ExecutionDetails);

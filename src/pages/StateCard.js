import React from 'react';
import Card from '@material-ui/core/Card';
import CardHeader from '@material-ui/core/CardHeader';
import { CardContent } from '@material-ui/core';
import Typography from '@material-ui/core/Typography';
import Grid from '@material-ui/core/Grid';

class StateCard extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            currentStateObj: null
        };
    }

    setCurrentSmState = (currentStateObj) => {
        this.setState({
            currentStateObj: currentStateObj
        })
    }

    renderIoCard(currentStateObj, cardTitle) {
        let stateDetailsPath = 'stateEnteredEventDetails';
        if (cardTitle === 'output') {
            stateDetailsPath = 'stateExitedEventDetails';
        }

        if (!currentStateObj || !currentStateObj[cardTitle] || !currentStateObj[cardTitle][stateDetailsPath]) {
            return null;
        }
        let stateDetails = currentStateObj[cardTitle][stateDetailsPath];
        return (
            <Card>
                <CardHeader title={cardTitle} />
                <CardContent>
                    <Typography component="p">
                        {stateDetails[cardTitle]}
                    </Typography>
                </CardContent>
            </Card>
        );
    }

    render() {
        let currentStateObj = this.state.currentStateObj || this.props.currentStateObj;

        if (currentStateObj && currentStateObj.input) {
            return (
                <Grid item xs>
                    <Card>
                        <CardContent>
                            <Typography variant="h5" gutterBottom>
                                Selected state: {currentStateObj.input.stateEnteredEventDetails.name}
                            </Typography>
                            <Grid container spacing={16}>
                                <Grid item xs>
                                    {this.renderIoCard(currentStateObj, 'input')}
                                </Grid>
                            </Grid>
                            <Grid container spacing={16}>
                                <Grid item xs>
                                    {this.renderIoCard(currentStateObj, 'output')}
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>
            );
        }

        return (
            <Grid item xs>
                <Card>
                    <CardContent>
                        <Typography variant="h5" gutterBottom>
                            Please select a step on the graph to see it's i/o
                        </Typography>
                    </CardContent>
                </Card>
            </Grid>
        );
    }
}

export default StateCard;
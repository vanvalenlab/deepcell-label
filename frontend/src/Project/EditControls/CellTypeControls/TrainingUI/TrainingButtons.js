import { Box, Button, Typography } from '@mui/material';
import Grid from '@mui/material/Grid';
import InsightsIcon from '@mui/icons-material/Insights';
import LinearProgress from '@mui/material/LinearProgress';
import ScatterPlotIcon from '@mui/icons-material/ScatterPlot';
import { useSelector } from '@xstate/react';
import { useState } from 'react';
import { useTheme } from '@mui/material/styles';
import { getCellList } from '../../../service/labels/channelExpressionMachine';
import { useChannelExpression } from '../../../ProjectContext';
import Hyperparameters from './Hyperparameters';

function TrainingButtons({ quantities, embedding }) {

    const batches = [1, 2, 4, 8, 16, 32, 64, 128];
    const epochs = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    const lrs = [0.001, 0.01, 0.1, 1.0];
    const channelExpression = useChannelExpression();
    const theme = useTheme();
    const processing = useSelector(channelExpression, (state) => state.matches('loaded.training'));
    const cellTypes = useSelector(channelExpression, (state) => state.context.cellTypes);
    const cellCount = getCellList(cellTypes).length;
    const progress = useSelector(channelExpression, (state) => state.context.epoch);
    const [batch, setBatch] = useState(batches[0]);
    const [epoch, setEpoch] = useState(epochs[0]);
    const [lr, setLr] = useState(lrs[0]);
    const badBatch = batch > cellCount;

    const handleVisualize = () => {
        channelExpression.send({ type: 'CALCULATE_UMAP', stat: quantities[embedding] });
    };

    const handlePredict = () => {
        if (!badBatch) {
            channelExpression.send({ type: 'TRAIN', stat: quantities[embedding], batchSize: batch, epochs: epoch, lr: lr });
        }
    };

    return (
        <Box sx={{marginTop: 2, marginLeft: 1.8}}>
            <Hyperparameters
                badBatch={badBatch}
                batches={batches}
                epochs={epochs}
                lrs={lrs}
                setBatch={setBatch}
                setEpoch={setEpoch}
                setLr={setLr}/>
            <Grid item>
                { badBatch
                    ? <Typography sx={{
                        position: 'absolute',
                        marginTop: -1.5,
                        marginLeft: 1.4,
                        color: theme.palette.error.main,
                        fontSize: 11,
                    }}> 
                        Exceeds # examples
                    </Typography>
                    : <Box/>
                }
            </Grid>
            <Grid item display='flex' sx={{marginTop: 1}}>
                <Button
                    sx={{ marginLeft: 1.55, width: 154.6 }}
                    variant='contained'
                    onClick={handleVisualize}
                    startIcon={<ScatterPlotIcon/>}
                >
                    Visualize
                </Button>
                <Button
                    sx={{ marginLeft: 2, width: 154.6 }}
                    variant='contained'
                    color='success'
                    onClick={handlePredict}
                    startIcon={<InsightsIcon/>}
                >
                    Predict
                </Button>
            </Grid>
            <Grid item>
                { processing
                    ? <LinearProgress
                        variant="determinate"
                        value={progress / epoch * 100}
                        sx={{ marginTop: 3, marginLeft: 1.6, width: 325 }}
                    />
                    : <LinearProgress
                        variant="determinate"
                        value={progress / epoch * 100}
                        sx={{ marginTop: 3, marginLeft: 1.6, width: 325 }}
                    />
                }
            </Grid>
        </Box>
    );
};

export default TrainingButtons;

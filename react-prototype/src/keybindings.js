import { canvasService } from './statechart/service';
import { bind } from 'mousetrap';

bind('space', () => canvasService.send('keydown.Space'));
bind('space', () => canvasService.send('keyup.Space'), 'keyup');
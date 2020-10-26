class History{
    constructor() {
        /** @property {Array<Actions|string>} undoStack actions grouped by fenceposts */
        this.undoStack = [];
        /** @property {Array<Actions|string>} redoStack undone actions grouped by fenceposts */
        this.redoStack = [];
    }

    /**
     * Interface for undoable actions to store in the action history.
     *
     * @interface Action
     */

    /**
     * Do the action before storing in the action history
     *
     * @function
     * @name Action#do
     */

    /**
     * Undo the action in the action history
     *
     * @function
     * @name Action#undo
     */

    /**
     * Redo an undone action in the action history
     *
     * @function
     * @name Action#redo
     */

    get canUndo() {
        return this.undoStack.length !== 0;
    }

    get canRedo() {
        return this.redoStack.length !== 0;
    }

    /**
     * Executes an action,
     * adds it to the current group of actions to be undone,
     * and clears the actions to be redone.
     * 
     * @param {Action} action 
     */
    addAction(action) {
        action.do();
        this.undoStack.push(action);
        this.redoStack = [];
        this.formatButtons();
    }

    /**
     * Executes an action,
     * fences it in to be undone alone,
     * and clears the actions to be redone.
     * 
     * @param {Action} action 
     */
    addFencedAction(action) {
        this.addFence();
        this.addAction(action);
        this.addFence();
    }

    /**
     * Separates groups of actions.
     * When a fence is added before an action, the action will be the first in a new group,
     * and when a fense is added after, the action will be the last in the group.
     */
    addFence() {
        this.undoStack.push('fencepost')
    }
    /**
     * Undoes the most recent group of actions, if any.
     */
    undo() {
        if (this.canUndo) {
            this.redoStack.push('fencepost');
        }
        let action = this.undoStack.pop();
        // Pop until we find an action
        // Ensures that undo does something
        while(this.canUndo && action === 'fencepost') {
            action = this.undoStack.pop();
        }
        while(true) {
            if (action === 'fencepost') {
                this.redoStack.push('fencepost');
                break;
            }
            if (!this.canUndo) break;
            action.undo();
            this.redoStack.push(action);
            action = this.undoStack.pop();
        }
        this.formatButtons();
    }

    /**
     * Redoes the most recent group of undone actions, if any.
     * Will only redo if called afer undo with no actions added between the calls.
     */
    redo() {
        if (this.canRedo) {
            this.undoStack.push('fencepost');
        }
        let action = this.redoStack.pop();
        // Pop until we find an action
        // Ensures that redo does something
        while(this.canRedo && action === 'fencepost') {
            action = this.redoStack.pop();
        }
        while (true) {
            if (action === 'fencepost') {
                this.undoStack.push('fencepost');
                break;
            }
            if (!this.canRedo) break;
            action.redo();
            this.undoStack.push(action);
            action = this.redoStack.pop();
        }
        this.formatButtons();
    }

    formatButtons() {
        document.getElementById('undo').disabled = !this.canUndo;
        document.getElementById('redo').disabled = !this.canRedo;
    }
}
import { AnyEventObject, Event, EventObject, InvokeCreator, Subscription } from 'xstate';

type Subscriber<TEvent extends EventObject> = (event: Event<TEvent>) => void;

/** Broadcasts events to all subscribers.
 * Add a subscriber function with subscribe.
 * Send an event with send to call each subscriber function with that event.
 *  */
export class EventBus<TEvent extends EventObject = AnyEventObject> {
  state: 'running' | 'stopped' = 'running';
  subscribers: Set<Subscriber<TEvent>> = new Set();

  constructor(readonly id: string) {}

  protected get isStopped() {
    return this.state === 'stopped';
  }

  subscribe(subscriber: Subscriber<TEvent>): Subscription | undefined {
    if (this.isStopped) return undefined;

    this.subscribers.add(subscriber);

    return {
      unsubscribe: () => this.subscribers.delete(subscriber),
    };
  }

  send(event: Event<TEvent>, subscriberToIgnore?: Subscriber<TEvent>) {
    if (this.isStopped) return;

    for (const subscriber of this.subscribers) {
      if (subscriber !== subscriberToIgnore) subscriber(event);
    }
  }

  stop() {
    if (this.isStopped) return;

    this.state = 'stopped';
    this.subscribers.clear();
  }
}

/** Returns a callback service to communicate events to and from an event bus.
 * When we send the service an event, it broadcasts the event to the event bus.
 * When the service receives an event from the event bus, it sends it back to the actor that invoked the service.
 */
export function fromEventBus<TContext, TEvent extends EventObject = AnyEventObject>(
  id: string,
  createEventBus: (context: TContext, event: TEvent) => EventBus<TEvent>,
  type: TEvent['type'] | TEvent['type'][]
): InvokeCreator<TContext, TEvent> {
  return (context, event) => (sendBack, receive) => {
    const bus = createEventBus(context, event);

    const subscriber: Subscriber<TEvent> = (event) => {
      if (type === undefined) {
        sendBack(event);
      } else {
        if (typeof event === 'string') {
          if (event === type) {
            sendBack(event);
          }
        } else {
          if (event.type === type || (Array.isArray(type) && type.includes(event.type))) {
            sendBack(event);
          }
        }
      }
      //   // if there is no recipient then its a broadcast, so send the event back
      //   // else only send the event if the recipient matches the id
      //   if (event.recipient === undefined || event.recipient === id) {
      //     sendBack(event);
      //   }
    };

    const subscription = bus.subscribe(subscriber);

    receive((event) => {
      // second argument prevents sending the event back to the sender
      bus.send(event, subscriber);
    });

    return () => {
      subscription?.unsubscribe();
    };
  };
}

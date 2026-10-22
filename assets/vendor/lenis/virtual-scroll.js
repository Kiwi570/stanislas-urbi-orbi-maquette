import { Emitter } from './emitter.js';
const LINE_HEIGHT = 100 / 6;
const listenerOptions = { passive: false };
function getDeltaMultiplier(deltaMode, size) {
    if (deltaMode === 1)
        return LINE_HEIGHT;
    if (deltaMode === 2)
        return size;
    return 1;
}
export class VirtualScroll {
    constructor(element, options = { wheelMultiplier: 1, touchMultiplier: 1 }) {
        this.element = element;
        this.options = options;
        this.touchStart = {
            x: 0,
            y: 0,
        };
        this.lastDelta = {
            x: 0,
            y: 0,
        };
        this.window = {
            width: 0,
            height: 0,
        };
        this.emitter = new Emitter();
        /**
         * Event handler for 'touchstart' event
         *
         * @param event Touch event
         */
        this.onTouchStart = (event) => {
            // @ts-expect-error - event.targetTouches is not defined
            const { clientX, clientY } = event.targetTouches
                ? event.targetTouches[0]
                : event;
            this.touchStart.x = clientX;
            this.touchStart.y = clientY;
            this.lastDelta = {
                x: 0,
                y: 0,
            };
            this.emitter.emit('scroll', {
                deltaX: 0,
                deltaY: 0,
                event,
            });
        };
        /** Event handler for 'touchmove' event */
        this.onTouchMove = (event) => {
            // @ts-expect-error - event.targetTouches is not defined
            const { clientX, clientY } = event.targetTouches
                ? event.targetTouches[0]
                : event;
            const deltaX = -(clientX - this.touchStart.x) * this.options.touchMultiplier;
            const deltaY = -(clientY - this.touchStart.y) * this.options.touchMultiplier;
            this.touchStart.x = clientX;
            this.touchStart.y = clientY;
            this.lastDelta = {
                x: deltaX,
                y: deltaY,
            };
            this.emitter.emit('scroll', {
                deltaX,
                deltaY,
                event,
            });
        };
        this.onTouchEnd = (event) => {
            this.emitter.emit('scroll', {
                deltaX: this.lastDelta.x,
                deltaY: this.lastDelta.y,
                event,
            });
        };
        /** Event handler for 'wheel' event */
        this.onWheel = (event) => {
            let { deltaX, deltaY, deltaMode } = event;
            const multiplierX = getDeltaMultiplier(deltaMode, this.window.width);
            const multiplierY = getDeltaMultiplier(deltaMode, this.window.height);
            deltaX *= multiplierX;
            deltaY *= multiplierY;
            deltaX *= this.options.wheelMultiplier;
            deltaY *= this.options.wheelMultiplier;
            this.emitter.emit('scroll', { deltaX, deltaY, event });
        };
        this.onWindowResize = () => {
            this.window = {
                width: window.innerWidth,
                height: window.innerHeight,
            };
        };
        window.addEventListener('resize', this.onWindowResize);
        this.onWindowResize();
        this.element.addEventListener('wheel', this.onWheel, listenerOptions);
        this.element.addEventListener('touchstart', this.onTouchStart, listenerOptions);
        this.element.addEventListener('touchmove', this.onTouchMove, listenerOptions);
        this.element.addEventListener('touchend', this.onTouchEnd, listenerOptions);
    }
    /**
     * Add an event listener for the given event and callback
     *
     * @param event Event name
     * @param callback Callback function
     */
    on(event, callback) {
        return this.emitter.on(event, callback);
    }
    /** Remove all event listeners and clean up */
    destroy() {
        this.emitter.destroy();
        window.removeEventListener('resize', this.onWindowResize);
        this.element.removeEventListener('wheel', this.onWheel, listenerOptions);
        this.element.removeEventListener('touchstart', this.onTouchStart, listenerOptions);
        this.element.removeEventListener('touchmove', this.onTouchMove, listenerOptions);
        this.element.removeEventListener('touchend', this.onTouchEnd, listenerOptions);
    }
}

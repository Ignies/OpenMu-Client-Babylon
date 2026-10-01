/**
 * The debug menu's own core tabs, registered on import (the window imports
 * this once). Each consumes only public seams - see each file and
 * documentation/debug_menu/ARCHITECTURE.md. A feature registers its own
 * module from its own folder instead of adding to this list (the day/night
 * cycle's Day tab is the reference example).
 */
import './move';
import './lighting';
import './info';

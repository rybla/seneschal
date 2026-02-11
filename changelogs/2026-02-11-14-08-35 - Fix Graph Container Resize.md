## Fix Graph Container Resize

Fixed an issue where the force graph container size was calculated as 0 initially. Refactored useElementSize to use a callback ref to correctly detect element size on mount, and updated the container style to fill available space.


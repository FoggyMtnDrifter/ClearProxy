<script lang="ts">
  /**
   * Custom scrollable area component with a customized scrollbar
   * Prevents layout shift by using an overlay scrollbar that doesn't take up space
   */
  import { onMount, afterUpdate, createEventDispatcher } from 'svelte'
  import { tweened } from 'svelte/motion'
  import { cubicOut } from 'svelte/easing'

  const dispatch = createEventDispatcher<{ scroll: { scrollTop: number; scrollLeft: number } }>()

  export let height: string = '100%'

  export let width: string = '100%'

  export let scrollbarVisible: boolean = true

  export let scrollbarWidth: number = 8

  export let alwaysShowScrollbar: boolean = false

  /**
   * Whether to automatically hide the scrollbar after a delay.
   * Only applies when alwaysShowScrollbar is false.
   */
  export let autoHide: boolean = true

  export let hideDelay: number = 1000

  export let direction: 'vertical' | 'horizontal' | 'both' = 'vertical'

  export let viewportClass: string = ''

  export let scrollbarClass: string = ''

  export let contentClass: string = ''

  let viewport: HTMLDivElement
  let content: HTMLDivElement
  let scrollbarY: HTMLDivElement
  let scrollbarX: HTMLDivElement
  let thumbY: HTMLDivElement
  let thumbX: HTMLDivElement

  let scrolling = false
  let showScrollbar = false
  let hideTimeoutId: ReturnType<typeof setTimeout> | null = null

  let contentHeight = 0
  let contentWidth = 0
  let viewportHeight = 0
  let viewportWidth = 0

  const scrollTop = tweened(0, { duration: 100, easing: cubicOut })
  const scrollLeft = tweened(0, { duration: 100, easing: cubicOut })

  const thumbYHeight = tweened(20, { duration: 100, easing: cubicOut })
  const thumbYPosition = tweened(0, { duration: 100, easing: cubicOut })
  const thumbXWidth = tweened(20, { duration: 100, easing: cubicOut })
  const thumbXPosition = tweened(0, { duration: 100, easing: cubicOut })

  let isDraggingY = false
  let isDraggingX = false
  let dragStartY = 0
  let dragStartThumbY = 0
  let dragStartX = 0
  let dragStartThumbX = 0

  let scrollYVisible = false
  let scrollXVisible = false

  /**
   * Updates scrollbar visibility based on content and viewport dimensions
   */
  function updateScrollbarVisibility() {
    scrollYVisible = direction !== 'horizontal' && contentHeight > viewportHeight
    scrollXVisible = direction !== 'vertical' && contentWidth > viewportWidth
  }

  /**
   * Updates the thumb size and position based on content and scroll position
   */
  function updateThumbY() {
    if (!viewport || !content) return

    const thumbRatio = Math.min(viewportHeight / contentHeight, 1)
    const minThumbSize = 20

    const calculatedThumbHeight = Math.max(minThumbSize, viewportHeight * thumbRatio)
    thumbYHeight.set(calculatedThumbHeight)

    const availableTrackHeight = viewportHeight - calculatedThumbHeight
    const scrollRatio = $scrollTop / (contentHeight - viewportHeight)
    thumbYPosition.set(availableTrackHeight * scrollRatio)
  }

  /**
   * Updates the horizontal thumb size and position
   */
  function updateThumbX() {
    if (!viewport || !content) return

    const thumbRatio = Math.min(viewportWidth / contentWidth, 1)
    const minThumbSize = 20

    const calculatedThumbWidth = Math.max(minThumbSize, viewportWidth * thumbRatio)
    thumbXWidth.set(calculatedThumbWidth)

    const availableTrackWidth = viewportWidth - calculatedThumbWidth
    const scrollRatio = $scrollLeft / (contentWidth - viewportWidth)
    thumbXPosition.set(availableTrackWidth * scrollRatio)
  }

  /**
   * Handles scroll event on the viewport
   */
  function handleScroll() {
    if (!viewport) return

    scrollTop.set(viewport.scrollTop, { duration: 0 })
    scrollLeft.set(viewport.scrollLeft, { duration: 0 })

    dispatch('scroll', { scrollTop: viewport.scrollTop, scrollLeft: viewport.scrollLeft })

    updateThumbY()
    updateThumbX()

    showScrollbar = true
    scrolling = true

    if (autoHide && !alwaysShowScrollbar) {
      if (hideTimeoutId) clearTimeout(hideTimeoutId)

      hideTimeoutId = setTimeout(() => {
        scrolling = false

        if (!alwaysShowScrollbar && !isDraggingY && !isDraggingX) {
          showScrollbar = false
        }
      }, hideDelay)
    }
  }

  /**
   * Starts dragging the vertical scrollbar thumb
   */
  function startDragY(e: MouseEvent | TouchEvent) {
    e.preventDefault()

    if (e instanceof MouseEvent) {
      dragStartY = e.clientY
    } else {
      dragStartY = e.touches[0].clientY
    }

    dragStartThumbY = $thumbYPosition
    isDraggingY = true
    showScrollbar = true

    document.addEventListener('mousemove', dragY)
    document.addEventListener('touchmove', dragY)
    document.addEventListener('mouseup', stopDragY)
    document.addEventListener('touchend', stopDragY)
  }

  /**
   * Drags the vertical scrollbar thumb
   */
  function dragY(e: MouseEvent | TouchEvent) {
    if (!isDraggingY) return

    let clientY: number
    if (e instanceof MouseEvent) {
      clientY = e.clientY
    } else {
      clientY = e.touches[0].clientY
    }

    const deltaY = clientY - dragStartY

    const availableTrackHeight = viewportHeight - $thumbYHeight
    const newThumbPos = Math.max(0, Math.min(availableTrackHeight, dragStartThumbY + deltaY))

    thumbYPosition.set(newThumbPos, { duration: 0 })

    const scrollRatio = newThumbPos / availableTrackHeight
    const newScrollTop = Math.round(scrollRatio * (contentHeight - viewportHeight))

    if (viewport) {
      viewport.scrollTop = newScrollTop
      scrollTop.set(newScrollTop, { duration: 0 })
    }
  }

  /**
   * Stops dragging the vertical scrollbar thumb
   */
  function stopDragY() {
    isDraggingY = false

    document.removeEventListener('mousemove', dragY)
    document.removeEventListener('touchmove', dragY)
    document.removeEventListener('mouseup', stopDragY)
    document.removeEventListener('touchend', stopDragY)

    if (autoHide && !alwaysShowScrollbar) {
      if (hideTimeoutId) clearTimeout(hideTimeoutId)

      hideTimeoutId = setTimeout(() => {
        if (!scrolling && !isDraggingY && !isDraggingX) {
          showScrollbar = false
        }
      }, hideDelay)
    }
  }

  /**
   * Starts dragging the horizontal scrollbar thumb
   */
  function startDragX(e: MouseEvent | TouchEvent) {
    e.preventDefault()

    if (e instanceof MouseEvent) {
      dragStartX = e.clientX
    } else {
      dragStartX = e.touches[0].clientX
    }

    dragStartThumbX = $thumbXPosition
    isDraggingX = true
    showScrollbar = true

    document.addEventListener('mousemove', dragX)
    document.addEventListener('touchmove', dragX)
    document.addEventListener('mouseup', stopDragX)
    document.addEventListener('touchend', stopDragX)
  }

  /**
   * Drags the horizontal scrollbar thumb
   */
  function dragX(e: MouseEvent | TouchEvent) {
    if (!isDraggingX) return

    let clientX: number
    if (e instanceof MouseEvent) {
      clientX = e.clientX
    } else {
      clientX = e.touches[0].clientX
    }

    const deltaX = clientX - dragStartX

    const availableTrackWidth = viewportWidth - $thumbXWidth
    const newThumbPos = Math.max(0, Math.min(availableTrackWidth, dragStartThumbX + deltaX))

    thumbXPosition.set(newThumbPos, { duration: 0 })

    const scrollRatio = newThumbPos / availableTrackWidth
    const newScrollLeft = Math.round(scrollRatio * (contentWidth - viewportWidth))

    if (viewport) {
      viewport.scrollLeft = newScrollLeft
      scrollLeft.set(newScrollLeft, { duration: 0 })
    }
  }

  /**
   * Stops dragging the horizontal scrollbar thumb
   */
  function stopDragX() {
    isDraggingX = false

    document.removeEventListener('mousemove', dragX)
    document.removeEventListener('touchmove', dragX)
    document.removeEventListener('mouseup', stopDragX)
    document.removeEventListener('touchend', stopDragX)

    if (autoHide && !alwaysShowScrollbar) {
      if (hideTimeoutId) clearTimeout(hideTimeoutId)

      hideTimeoutId = setTimeout(() => {
        if (!scrolling && !isDraggingY && !isDraggingX) {
          showScrollbar = false
        }
      }, hideDelay)
    }
  }

  /**
   * Show the scrollbar when hovering over the component
   */
  function handleMouseEnter() {
    showScrollbar = true
  }

  /**
   * Hide the scrollbar when leaving the component if not dragging or scrolling
   */
  function handleMouseLeave() {
    if (!isDraggingY && !isDraggingX && !scrolling && !alwaysShowScrollbar && autoHide) {
      showScrollbar = false
    }
  }

  /**
   * Track content size changes using a ResizeObserver
   */
  function observeContentSize() {
    if (!content) return

    const resizeObserver = new ResizeObserver(() => {
      if (content) {
        contentHeight = content.scrollHeight
        contentWidth = content.scrollWidth
        updateScrollbarVisibility()
        updateThumbY()
        updateThumbX()
      }
    })

    resizeObserver.observe(content)

    return () => {
      resizeObserver.disconnect()
    }
  }

  /**
   * Track viewport size changes using a ResizeObserver
   */
  function observeViewportSize() {
    if (!viewport) return

    const resizeObserver = new ResizeObserver(() => {
      if (viewport) {
        viewportHeight = viewport.clientHeight
        viewportWidth = viewport.clientWidth
        updateScrollbarVisibility()
        updateThumbY()
        updateThumbX()
      }
    })

    resizeObserver.observe(viewport)

    return () => {
      resizeObserver.disconnect()
    }
  }

  onMount(() => {
    if (!viewport || !content) return

    contentHeight = content.scrollHeight
    contentWidth = content.scrollWidth
    viewportHeight = viewport.clientHeight
    viewportWidth = viewport.clientWidth

    const unobserveContent = observeContentSize()
    const unobserveViewport = observeViewportSize()

    updateScrollbarVisibility()
    updateThumbY()
    updateThumbX()

    showScrollbar = alwaysShowScrollbar

    return () => {
      if (hideTimeoutId) clearTimeout(hideTimeoutId)
      unobserveContent && unobserveContent()
      unobserveViewport && unobserveViewport()

      document.removeEventListener('mousemove', dragY)
      document.removeEventListener('touchmove', dragY)
      document.removeEventListener('mouseup', stopDragY)
      document.removeEventListener('touchend', stopDragY)
      document.removeEventListener('mousemove', dragX)
      document.removeEventListener('touchmove', dragX)
      document.removeEventListener('mouseup', stopDragX)
      document.removeEventListener('touchend', stopDragX)
    }
  })

  afterUpdate(() => {
    updateScrollbarVisibility()
    updateThumbY()
    updateThumbX()
  })

  export function scrollTo({ top, left }: { top?: number; left?: number }) {
    if (viewport) {
      if (top !== undefined) {
        viewport.scrollTop = top
        scrollTop.set(top)
      }
      if (left !== undefined) {
        viewport.scrollLeft = left
        scrollLeft.set(left)
      }
    }
  }

  export function scrollToTop() {
    scrollTo({ top: 0 })
  }

  export function scrollToBottom() {
    if (viewport && content) {
      const maxScroll = content.scrollHeight - viewport.clientHeight
      scrollTo({ top: maxScroll })
    }
  }
</script>

<div
  class="scroll-area relative {alwaysShowScrollbar ? 'overflow-hidden' : 'overflow-hidden'}"
  style="width: {width}; height: {height};"
  on:mouseenter={handleMouseEnter}
  on:mouseleave={handleMouseLeave}
  role="region"
  aria-label="Scrollable content"
>
  <div
    bind:this={viewport}
    class="scroll-area-viewport overflow-auto h-full w-full {viewportClass}"
    on:scroll={handleScroll}
    style="scrollbar-width: none; -ms-overflow-style: none; {direction === 'horizontal'
      ? 'overflow-y: hidden;'
      : ''} {direction === 'vertical' ? 'overflow-x: hidden;' : ''}"
  >
    <div bind:this={content} class="scroll-area-content {contentClass}">
      <slot />
    </div>
  </div>

  {#if scrollbarVisible && scrollYVisible}
    <div
      bind:this={scrollbarY}
      class="scroll-area-scrollbar absolute top-0 right-0 bottom-0 w-[var(--scrollbar-width)] touch-none transition-opacity duration-200 {scrollbarClass} {showScrollbar
        ? 'opacity-100'
        : 'opacity-0'}"
      style="--scrollbar-width: {scrollbarWidth}px; width: {scrollbarWidth}px;"
    >
      <div
        bind:this={thumbY}
        class="scroll-area-thumb absolute right-0 rounded-full bg-gray-400 hover:bg-gray-500 dark:bg-gray-600 dark:hover:bg-gray-500 transition-colors touch-none cursor-pointer"
        style="top: {$thumbYPosition}px; height: {$thumbYHeight}px; width: {scrollbarWidth -
          2}px; left: 1px;"
        on:mousedown={startDragY}
        on:touchstart={startDragY}
        role="scrollbar"
        aria-orientation="vertical"
        aria-controls="viewport"
        aria-valuenow={Math.round(($scrollTop / (contentHeight - viewportHeight || 1)) * 100) || 0}
        aria-valuemin="0"
        aria-valuemax="100"
        tabindex="0"
      ></div>
    </div>
  {/if}

  {#if scrollbarVisible && scrollXVisible}
    <div
      bind:this={scrollbarX}
      class="scroll-area-scrollbar absolute left-0 right-0 bottom-0 h-[var(--scrollbar-width)] touch-none transition-opacity duration-200 {scrollbarClass} {showScrollbar
        ? 'opacity-100'
        : 'opacity-0'}"
      style="--scrollbar-width: {scrollbarWidth}px; height: {scrollbarWidth}px;"
    >
      <div
        bind:this={thumbX}
        class="scroll-area-thumb absolute bottom-0 rounded-full bg-gray-400 hover:bg-gray-500 dark:bg-gray-600 dark:hover:bg-gray-500 transition-colors touch-none cursor-pointer"
        style="left: {$thumbXPosition}px; width: {$thumbXWidth}px; height: {scrollbarWidth -
          2}px; top: 1px;"
        on:mousedown={startDragX}
        on:touchstart={startDragX}
        role="scrollbar"
        aria-orientation="horizontal"
        aria-controls="viewport"
        aria-valuenow={Math.round(($scrollLeft / (contentWidth - viewportWidth || 1)) * 100) || 0}
        aria-valuemin="0"
        aria-valuemax="100"
        tabindex="0"
      ></div>
    </div>
  {/if}
</div>

<style>
  .scroll-area-viewport::-webkit-scrollbar {
    display: none;
  }

  /*
   * Allow pointer events on thumb but not on track
   * This way clicks/touches pass through to content when not on thumb
   */
  .scroll-area-scrollbar {
    pointer-events: none;
  }
  .scroll-area-thumb {
    pointer-events: auto;
  }
</style>

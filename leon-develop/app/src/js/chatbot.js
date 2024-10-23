import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import axios from 'axios'
import { WidgetWrapper, Flexbox, Loader, Text } from '@leon-ai/aurora'

import renderAuroraComponent from './render-aurora-component'

const WIDGETS_TO_FETCH = []
const WIDGETS_FETCH_CACHE = new Map()

export default class Chatbot {
  constructor(socket, serverURL) {
    this.socket = socket
    this.serverURL = serverURL
    this.et = new EventTarget()
    this.feed = document.querySelector('#feed')
    this.typing = document.querySelector('#is-typing')
    this.noBubbleMessage = document.querySelector('#no-bubble')
    this.bubbles = localStorage.getItem('bubbles')
    this.parsedBubbles = JSON.parse(this.bubbles)
  }

  async init() {
    await this.loadFeed()
    this.scrollDown()

    this.et.addEventListener('to-leon', (event) => {
      this.createBubble({
        who: 'me',
        string: event.detail
      })
    })

    this.et.addEventListener('me-received', (event) => {
      this.createBubble({
        who: 'leon',
        string: event.detail
      })
    })
  }

  sendTo(who, string) {
    if (who === 'leon') {
      this.et.dispatchEvent(new CustomEvent('to-leon', { detail: string }))
    }
  }

  receivedFrom(who, string) {
    if (who === 'leon') {
      this.et.dispatchEvent(new CustomEvent('me-received', { detail: string }))
    }
  }

  isTyping(who, value) {
    if (who === 'leon') {
      if (value) {
        this.enableTyping()
      } else if (value === false) {
        this.disableTyping()
      }
    }
  }

  enableTyping() {
    if (!this.typing.classList.contains('on')) {
      this.typing.classList.add('on')
    }
  }

  disableTyping() {
    if (this.typing.classList.contains('on')) {
      this.typing.classList.remove('on')
    }
  }

  scrollDown() {
    this.feed.scrollTo(0, this.feed.scrollHeight)
  }

  loadFeed() {
    return new Promise(async (resolve) => {
      if (this.parsedBubbles === null || this.parsedBubbles.length === 0) {
        this.noBubbleMessage.classList.remove('hide')
        localStorage.setItem('bubbles', JSON.stringify([]))
        this.parsedBubbles = []
        resolve()
      } else {
        for (let i = 0; i < this.parsedBubbles.length; i += 1) {
          const bubble = this.parsedBubbles[i]

          this.createBubble({
            who: bubble.who,
            string: bubble.string,
            save: false,
            isCreatingFromLoadingFeed: true
          })

          if (i + 1 === this.parsedBubbles.length) {
            setTimeout(() => {
              resolve()
            }, 100)
          }
        }

        /**
         * Browse widgets that need to be fetched.
         * Reverse widgets to fetch the last widgets first.
         * Replace the loading content with the fetched widget
         */
        const widgetContainers = WIDGETS_TO_FETCH.reverse()
        for (let i = 0; i < widgetContainers.length; i += 1) {
          const widgetContainer = widgetContainers[i]
          const hasWidgetBeenFetched = WIDGETS_FETCH_CACHE.has(
            widgetContainer.widgetId
          )

          if (hasWidgetBeenFetched) {
            const fetchedWidget = WIDGETS_FETCH_CACHE.get(
              widgetContainer.widgetId
            )
            widgetContainer.reactRootNode.render(fetchedWidget.reactNode)

            setTimeout(() => {
              this.scrollDown()
            }, 100)

            continue
          }

          const data = await axios.get(
            `${this.serverURL}/api/v1/fetch-widget?skill_action=${widgetContainer.onFetch.actionName}&widget_id=${widgetContainer.widgetId}`
          )
          const fetchedWidget = data.data.widget
          const reactNode = fetchedWidget
            ? renderAuroraComponent(
                this.socket,
                fetchedWidget.componentTree,
                fetchedWidget.supportedEvents
              )
            : createElement(WidgetWrapper, {
                children: createElement(Flexbox, {
                  alignItems: 'center',
                  justifyContent: 'center',
                  children: createElement(Text, {
                    secondary: true,
                    children: 'This widget has been deleted.'
                  })
                })
              })

          widgetContainer.reactRootNode.render(reactNode)
          WIDGETS_FETCH_CACHE.set(widgetContainer.widgetId, {
            ...fetchedWidget,
            reactNode
          })
          setTimeout(() => {
            this.scrollDown()
          }, 100)
        }
      }
    })
  }

  createBubble(params) {
    const {
      who,
      string,
      save = true,
      bubbleId,
      isCreatingFromLoadingFeed = false
    } = params
    const container = document.createElement('div')
    const bubble = document.createElement('p')

    container.className = `bubble-container ${who}`
    bubble.className = 'bubble'

    const formattedString = this.formatMessage(string)

    bubble.innerHTML = formattedString

    if (bubbleId) {
      container.classList.add(bubbleId)
    }

    this.feed.appendChild(container).appendChild(bubble)

    let widgetComponentTree = null
    let widgetSupportedEvents = null

    /**
     * Widget rendering
     */
    if (
      formattedString.includes &&
      formattedString.includes('"component":"WidgetWrapper"')
    ) {
      const parsedWidget = JSON.parse(formattedString)
      container.setAttribute('data-widget-id', parsedWidget.id)

      /**
       * On widget fetching, render the loader
       */
      if (isCreatingFromLoadingFeed && parsedWidget.onFetch) {
        const root = createRoot(container)

        root.render(
          createElement(WidgetWrapper, {
            children: createElement(Flexbox, {
              alignItems: 'center',
              justifyContent: 'center',
              children: createElement(Loader)
            })
          })
        )

        WIDGETS_TO_FETCH.push({
          reactRootNode: root,
          widgetId: parsedWidget.id,
          onFetch: parsedWidget.onFetch
        })

        return
      }

      widgetComponentTree = parsedWidget.componentTree
      widgetSupportedEvents = parsedWidget.supportedEvents

      /**
       * On widget creation
       */
      const root = createRoot(container)

      const reactNode = renderAuroraComponent(
        this.socket,
        widgetComponentTree,
        widgetSupportedEvents
      )

      root.render(reactNode)
    }

    if (save) {
      this.saveBubble(who, formattedString)
    }

    return container
  }

  saveBubble(who, string) {
    if (!this.noBubbleMessage.classList.contains('hide')) {
      this.noBubbleMessage.classList.add('hide')
    }

    if (this.parsedBubbles.length === 62) {
      this.parsedBubbles.shift()
    }

    this.parsedBubbles.push({ who, string })
    localStorage.setItem('bubbles', JSON.stringify(this.parsedBubbles))
    this.scrollDown()
  }

  formatMessage(message) {
    if (typeof message === 'string') {
      message = message.replace(/\n/g, '<br />')
    }

    return message
  }
}

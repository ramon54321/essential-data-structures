/**
 * An ordered map which allows object properties to be used as indexes. This allows for fast access given the indexed property value. Note, memory footprint is large as map is replicated for each index.
 */
export class IndexedMap<T extends object> {
  private _idCounter: number = 0
  private _tagCounter: number = 0
  private _tagOrder: Array<string>
  private _tagMap: {[key: string]: T}
  private _keys: Array<keyof T>
  private _keyMaps: {[key: string]: {[key: string]: Array<T>}}

  constructor(keys?: Array<string>) {
    this._tagOrder = []
    this._tagMap = {}
    this._keys = keys as Array<keyof T> || []
    this._keyMaps = {}
    this._keys.forEach(key => this._keyMaps[key as string] = {})
  }

  /**
   * Returns the number of elements in the map
   */
  count(): number {
    return this._tagOrder.length
  }

  /**
   * Set the value of a first level property on the element with the given tag
   */
  set(tag: string | number, property: string, value: any): boolean {
    // Convert tag to a string in case tag was specified as an index
    if (typeof tag === 'number') {
      tag = tag.toFixed()
    }

    // Get the existing element with the given tag
    const element: any = this.get(tag)

    // Return false if the element does not exist in the map
    if (element === undefined) return false

    // Directly set the value of the property if the value is not keyed
    if (!this._keys.includes(property as keyof T)) {
      element[property] = value

      // Return successful setting of the value
      return true
    }

    // Get the currect position of the element in the tag order array
    const currentIndex = this._tagOrder.indexOf(property)

    // Remove the element from the map (This will remove the needed indexes)
    this.remove(tag)

    // Set the value
    element[property] = value

    // Add the element back into the map (This will create the needed indexes)
    this.add(element, tag, currentIndex)

    // Return successful setting of the value
    return true
  }

  /**
   * Return an element by its unique tag
   */
  get(tag: string): T | undefined {
    return this._tagMap[tag]
  }

  /**
   * Return an element by numerical index into the order array
   */
  getByIndex(index: number): T {
    return this._tagMap[this._tagOrder[index]]
  }

  /**
   * Return an array of elements by a specific key's value
   */
  getWhere(key: string, value: any): Array<T> {
    // Return by tag instead if the key is tag
    if (key === 'tag') return [this._tagMap[key]]

    // Get keyMap for specified key
    const keyMap = this._keyMaps[key]

    // Return the value at the specified key's value or an empty array if no keymap exists for the given key
    return keyMap ? keyMap[value] : []
  }

  /**
   * Return the first element by a specified key's value
   */
  getFirstWhere(key: string, value: any): T | undefined {
    return this.getWhere(key, value)[0]
  }

  /**
   * Add an element to the map with the specified unique tag and optionally the index representing it's order in enumeration
   */
  add(element: T, tag?: string, index?: number): boolean {
    // Set the tag if not set
    tag = tag || (this._tagCounter++).toFixed()

    // Return false if an element already exists with the specified tag
    if (this._tagMap[tag] !== undefined) return false

    // Add unique ID to object
    if((element as any)._id === undefined) {
      Object.defineProperty(element, '_id', {
        value: this._idCounter++,
        enumerable: true,
        writable: false
      })
    }
    
    // Add the tag to the tag order array at the specified index
    this._tagOrder.splice(index !== undefined ? index : this._tagOrder.length, 0, tag)

    // Add the element to the tag map
    this._tagMap[tag] = element

    // Add the element to each keyMap
    this._keys.forEach(key => {
      // Return if the added element does not have the specified key
      if (element[key] === undefined) return

      // KeyMap for given key
      const keyMap = (this._keyMaps as any)[key]

      // The current elements at the specified key in the keyMap
      const currentKeyMapValue = keyMap[element[key]]
      
      if (currentKeyMapValue !== undefined) {
        // If other elements already exist at the specified key in the keyMap
        currentKeyMapValue.push(element)
      } else {
        // If this is the first element at the specified key in the keyMap
        keyMap[element[key]] = [element]
      }
    })

    // Return sucessful element addition to the map
    return true
  }

  /**
   * Add element to the start of the map
   */
  unshift(element: T, tag?: string): boolean {
    return this.add(element, tag, 0)
  }

  /**
   * Remove an element from the map by it's unique tag
   */
  remove(tag: string): boolean {
    // Get element given tag
    const element = this._tagMap[tag]

    // Return false if element does not exist in map
    if (element === undefined) return false

    // Delete the element from the tagMap
    delete this._tagMap[tag]

    // Get the index of the tag in the tag order list
    const _tagOrderIndex = this._tagOrder.indexOf(tag)

    // Remove tag from the tag order list given the index
    this._tagOrder.splice(_tagOrderIndex, 1)

    // Remove the element from each keyMap
    this._keys.forEach(key => {
      // Get the keyMap
      const keyMap = this._keyMaps[key as string]

      // Get the elements in the keyMap at the specified key
      const keyMapValue = keyMap[(element as any)[key as string]]

      // Skip key if keyMap does not have elements at the specified key
      if (keyMapValue === undefined) return

      // Get the index of the element in the keyMap at the specified key
      const index = keyMapValue.indexOf(element)

      // Remove the element from the elements at the specified key in the keyMap
      keyMapValue.splice(index, 1)

      // Remove the entire key at in the keyMap if there are no elements remaining
      if (keyMapValue.length === 0) {
        delete this._keyMaps[key as string][(element as any)[key]]
      }
    })

    // Return successful element removal from the map
    return true
  }

  /**
   * Execute the callback for each element in the map
   */
  forEach(callback: (tag: string, value: any, index: number) => void) {
    this._tagOrder.forEach((tag, index) => {
      callback(tag, this._tagMap[tag], index)
    })
  }

  /**
   * Returns a map with the elements resulting from applying the callback function
   */
  map<R extends object>(keys: Array<string>, callback: (tag: string, value: any, index: number) => R): IndexedMap<R> {
    // Map to store the resulting elements
    const map = new IndexedMap<R>(keys)

    // Apply the callback function to each element and add to the new map
    this.forEach((tag: string, value: any, index: number) => map.add(callback(tag, value, index), tag))

    // Return the new map
    return map
  }
}

/**
 * A queue for FIFO application. The first element to be enqueued will be the first element to dequeue.
 */
export class Queue<T> {
  private _queue: Array<T> = []

  /**
   * Add an element to the back of the queue
   */
  enqueue(element: T) {
    this._queue.push(element)
  }

  /**
   * Get the element from the front of the queue and remove it from the queue
   */
  dequeue(): T | undefined {
    return this._queue.shift()
  }

  /**
   * Dequeue each element in the queue and pass it to the given function
   */
  dequeueEach(f: (element: T) => void) {
    while(true) {
      const element = this.dequeue()
      if (element !== undefined) {
        f(element)
      } else {
        break
      }
    }
  }
}

/**
 * A map optimized for storing elements based on their X and Y coordinate
 */
export class SpatialMap2D<T> {
  private readonly _map: any = {}

  /**
   * Get an element from the map given it's X and Y coordinate
   */
  get(x: number, y: number): T | undefined {
    // Get the map for the given X coordinate
    const xMap = this._map[x]

    // Return if no X coordinate map exists
    if (xMap === undefined) return

    // Get the element from the X coordinate map
    const element = xMap[y]
    return element
  }

  /**
   * Get all elements from the map within the specified steps from the initial given X and Y coordinate
   * 
   * SkipSelf can be set to true to ignore the element on the initial X and Y coordinate
   */
  getWithinSteps(x: number, y: number, steps: number, skipSelf: boolean = false): Array<T> {
    const elements: Array<T> = []

    // Calculate the search bounds from steps and initial X and Y coordinate
    const xMin = x - steps
    const xMax = x + steps
    const yMin = y - steps
    const yMax = y + steps

    // Search for elements within the bounds
    for (let yi = yMin; yi <= yMax; yi++) {
      for (let xi = xMin; xi <= xMax; xi++) {
        // Skip coordinate if is initial coordinate and skipSelf is set to true
        if (skipSelf && xi == x && yi == y) continue

        // Try to get element at search coordinate
        const element = this.get(xi, yi)

        // Append element to found elements if element was present
        if (element) elements.push(element)
      }
    }
    return elements
  }

  /**
   * Set an element into the map at the given X and Y coordinate
   */
  set(x: number, y: number, element: T) {
    // Create xMap if it doesn't already exist
    if (this._map[x] === undefined) {
      this._map[x] = {}
    }

    // Set the element on the xMap at the Y key
    this._map[x][y] = element
  }
}
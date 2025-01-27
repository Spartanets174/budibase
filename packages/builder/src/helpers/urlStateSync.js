import { _ } from "../../lang/i18n"
import { get } from "svelte/store"
import { isChangingPage } from "@roxi/routify"

export const syncURLToState = options => {
  const {
    urlParam,
    stateKey,
    validate,
    update,
    baseUrl = "..",
    fallbackUrl,
    store,
    routify,
    beforeNavigate,
    decode,
  } = options || {}
  if (
    !urlParam ||
    !stateKey ||
    !baseUrl ||
    !urlParam ||
    !store?.subscribe ||
    !routify ||
    !routify.params?.subscribe ||
    !routify.goto?.subscribe ||
    !routify.redirect?.subscribe ||
    !routify.page?.subscribe
  ) {
    console.warn($_("helpers.urlStateSync.syncURLToState"))
    return
  }

  // Decodes encoded URL params if required
  const decodeParams = urlParams => {
    if (!decode) {
      return urlParams
    }
    let decoded = {}
    Object.keys(urlParams || {}).forEach(key => {
      decoded[key] = decode(urlParams[key])
    })
    return decoded
  }

  // We can't dynamically fetch the value of stateful routify stores so we need
  // to just subscribe and cache the latest versions.
  // We can grab their initial values as this is during component
  // initialisation.
  let cachedParams = decodeParams(get(routify.params))
  let cachedGoto = get(routify.goto)
  let cachedRedirect = get(routify.redirect)
  let cachedPage = get(routify.page)
  let previousParamsHash = null
  let debug = false
  const log = (...params) => debug && console.log(`[${urlParam}]`, ...params)

  // Navigate to a certain URL
  const gotoUrl = (url, params) => {
    if (beforeNavigate) {
      const res = beforeNavigate(url, params)
      if (res?.url) {
        url = res.url
      }
      if (res?.params) {
        params = res.params
      }
    }
    log(
      $_("helpers.urlStateSync.Navigating"),
      url,
      $_("helpers.urlStateSync.with_params"),
      params
    )
    cachedGoto(url, params)
  }

  // Redirect to a certain URL
  const redirectUrl = url => {
    log($_("helpers.urlStateSync.Redirecting_to"), url)
    cachedRedirect(url)
  }

  // Updates state with new URL params
  const mapUrlToState = params => {
    // Check if we have new URL params
    const paramsHash = JSON.stringify(params)
    const newParams = paramsHash !== previousParamsHash
    previousParamsHash = paramsHash
    const urlValue = params?.[urlParam]
    const stateValue = get(store)?.[stateKey]
    if (!newParams || !urlValue) {
      return
    }

    // Check if new value is valid
    if (validate && fallbackUrl) {
      if (!validate(urlValue)) {
        log($_("helpers.urlStateSync.Invalid_URL"), urlValue)
        redirectUrl(fallbackUrl)
        return
      }
    }

    // Only update state if we have a new value
    if (urlValue !== stateValue) {
      log(`state.${stateKey} (${stateValue}) <= url.${urlParam} (${urlValue})`)
      if (update) {
        // Use custom update function if provided
        update(urlValue)
      } else {
        // Otherwise manually update the store
        store.update(state => ({
          ...state,
          [stateKey]: urlValue,
        }))
      }
    }
  }

  // Updates the URL with new state values
  const mapStateToUrl = state => {
    let needsUpdate = false
    const urlValue = cachedParams?.[urlParam]
    const stateValue = state?.[stateKey]
    if (stateValue !== urlValue) {
      needsUpdate = true
      log(`url.${urlParam} (${urlValue}) <= state.${stateKey} (${stateValue})`)
      if (validate && fallbackUrl) {
        if (!validate(stateValue)) {
          log($_("helpers.urlStateSync.Invalid_state"), stateValue)
          redirectUrl(fallbackUrl)
          return
        }
      }
    }

    // Avoid updating the URL if not necessary to prevent a wasted render
    // cycle
    if (!needsUpdate) {
      return
    }

    // Navigate to the new URL
    if (!get(isChangingPage)) {
      const newUrlParams = {
        ...cachedParams,
        [urlParam]: stateValue,
      }
      gotoUrl(cachedPage.path, newUrlParams)
    }
  }

  // Initially hydrate state from URL
  mapUrlToState(cachedParams)

  // Subscribe to URL changes and cache them
  const unsubscribeParams = routify.params.subscribe($urlParams => {
    $urlParams = decodeParams($urlParams)
    cachedParams = $urlParams
    mapUrlToState($urlParams)
  })

  // Subscribe to routify store changes and cache them
  const unsubscribeGoto = routify.goto.subscribe($goto => {
    cachedGoto = $goto
  })
  const unsubscribeRedirect = routify.redirect.subscribe($redirect => {
    cachedRedirect = $redirect
  })
  const unsubscribePage = routify.page.subscribe($page => {
    cachedPage = $page
  })

  // Subscribe to store changes and keep URL up to date
  const unsubscribeStore = store.subscribe(mapStateToUrl)

  // Return an unsync function to cancel subscriptions
  return () => {
    unsubscribeParams()
    unsubscribeGoto()
    unsubscribeRedirect()
    unsubscribePage()
    unsubscribeStore()
  }
}

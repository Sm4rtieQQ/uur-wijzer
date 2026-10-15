import { mount, type VueWrapper } from '@vue/test-utils'
import type { Component } from 'vue'

/** Zoekt een knop op zijn zichtbare tekst. */
export function findButton(wrapper: VueWrapper, text: string, index = 0) {
  const buttons = wrapper.findAll('button').filter((item) => item.text().includes(text))
  const button = buttons[index]
  if (!button) {
    throw new Error(
      `Knop ${index} met tekst "${text}" niet gevonden. Knoppen: ${wrapper
        .findAll('button')
        .map((item) => item.text())
        .join(' | ')}`,
    )
  }
  return button
}

/** Zoekt een element op basis van een CSS-selector, met duidelijke foutmelding. */
export function requireElement(wrapper: VueWrapper, selector: string) {
  const element = wrapper.find(selector)
  if (!element.exists()) {
    throw new Error(`Element "${selector}" niet gevonden.`)
  }
  return element
}

/** Verstuurt een formulier in de component; standaard het eerste formulier. */
export async function submitForm(wrapper: VueWrapper, index = 0) {
  const form = wrapper.findAll('form')[index]
  if (!form) {
    throw new Error(`Formulier ${index} niet gevonden om te versturen.`)
  }
  await form.trigger('submit')
}

/** Mount een component met tekstuele weergave van waarschuwingen uitgeschakeld. */
export function mountPage(component: Component, props: Record<string, unknown> = {}) {
  return mount(component, { props })
}

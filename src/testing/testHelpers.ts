import { mount, type VueWrapper } from '@vue/test-utils'
import { expect } from 'vitest'
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

/**
 * Zoekt een container met `name` én `id` (altijd dezelfde waarde).
 * Gooit een fout met alle gevonden containers als de container ontbreekt.
 */
export function requireContainer(wrapper: VueWrapper, containerId: string) {
  const element = wrapper.find(`[name="${containerId}"][id="${containerId}"]`)
  if (!element.exists()) {
    const found = wrapper.findAll('[name]').map((item) => item.attributes('name'))
    throw new Error(
      `Container name="${containerId}" id="${containerId}" niet gevonden. Wel gevonden: ${found.join(', ')}`,
    )
  }
  return element
}

/**
 * Controleert dat elke **container** met een `name`-attribuut ook een `id` met
 * dezelfde waarde heeft en dat die ids uniek zijn binnen de component.
 * Invoervelden (input/select/textarea) vallen buiten deze conventie en worden
 * overgeslagen.
 */
export function expectUniqueContainerIds(wrapper: VueWrapper): void {
  const seen = new Set<string>()
  const formControls = ['INPUT', 'SELECT', 'TEXTAREA']
  const containers = wrapper
    .findAll('[name]')
    .filter((item) => !formControls.includes(item.element.tagName.toUpperCase()))

  for (const element of containers) {
    const name = element.attributes('name')
    const id = element.attributes('id')
    expect(id, `container name="${name}" mist een id`).toBeTypeOf('string')
    expect(id, `container name="${name}" heeft id="${String(id)}"`).toBe(name)
    expect(seen.has(String(id)), `dubbel id "${String(id)}" in container name="${name}"`).toBe(false)
    seen.add(String(id))
  }
  expect(containers.length).toBeGreaterThan(0)
}

/** Mount een component met tekstuele weergave van waarschuwingen uitgeschakeld. */
export function mountPage(component: Component, props: Record<string, unknown> = {}) {
  return mount(component, { props })
}

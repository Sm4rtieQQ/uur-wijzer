<template>
  <!--
    Klokdecor voor de banner. De uitsnede van "banner example.jpg" (ring met
    uurlijnen op 12, 11 en 10 uur) staat in de viewBox; met
    preserveAspectRatio="xMinYMax meet" schaalt hij op de hoogte van de banner
    en blijft hij op de linkeronderhoek staan. De vorm is horizontaal
    gespiegeld (scale(-1,1)) zodat de ring naar links loopt. De kleur komt
    uit --uw-accent-soft (per profiel).
  -->
  <svg
    class="uw-banner-dial"
    viewBox="0 0 1583 758"
    preserveAspectRatio="xMinYMax meet"
    aria-hidden="true"
    focusable="false"
  >
    <g transform="scale(-1 1) translate(-1583 0)">
      <!-- Ring: middellijn 813,22 met lijndikte 141,38 (binnen 742,53 / buiten 883,91) -->
      <circle cx="1349.69" cy="1012.19" r="813.22" stroke-width="141.38" />
      <!-- Uurlijnen op 12, 11 en 10 uur: radiale streepjes van r = 597,9 tot r = 692,6 -->
      <g stroke-width="34.6" stroke-linecap="butt">
        <line x1="1349.69" y1="414.29" x2="1349.69" y2="319.59" />
        <line
          x1="1349.69"
          y1="414.29"
          x2="1349.69"
          y2="319.59"
          transform="rotate(-30 1349.69 1012.19)"
        />
        <line
          x1="1349.69"
          y1="414.29"
          x2="1349.69"
          y2="319.59"
          transform="rotate(-60 1349.69 1012.19)"
        />
      </g>
    </g>
  </svg>
</template>

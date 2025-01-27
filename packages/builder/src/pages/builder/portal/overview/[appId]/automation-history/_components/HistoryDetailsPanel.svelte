<script>
  import {
    Layout,
    Body,
    Button,
    InlineAlert,
    Heading,
    Icon,
  } from "@budibase/bbui"
  import StatusRenderer from "./StatusRenderer.svelte"
  import DateTimeRenderer from "components/common/renderers/DateTimeRenderer.svelte"
  import TestDisplay from "components/automation/AutomationBuilder/TestDisplay.svelte"
  import { goto } from "@roxi/routify"
  import { automationStore } from "builderStore"

  import { _ } from "../../../../../../../../lang/i18n"

  export let history
  export let appId
  export let close
  const STOPPED_ERROR = "stopped_error"

  $: exists = $automationStore.automations?.find(
    auto => auto._id === history?.automationId
  )
</script>

{#if history}
  <Layout noPadding>
    <div class="controls">
      <StatusRenderer value={history.status} />
      <Icon hoverable name="Close" on:click={close} />
    </div>
    <Layout noPadding gap="XS">
      <Heading>{history.automationName}</Heading>
      <DateTimeRenderer value={history.createdAt} />
    </Layout>
    {#if history.status === STOPPED_ERROR}
      <div class="cron-error">
        <InlineAlert
          type="error"
          header={$_(
            "pages.builder.portal.overview.appId.automation-history._components.HistoryDetailsPanel.CRON_disabled"
          )}
          message={$_(
            "pages.builder.portal.overview.appId.automation-history._components.HistoryDetailsPanel.Fix_error"
          )}
        />
      </div>
    {/if}
    {#if exists}
      <div>
        <Button
          secondary
          on:click={() => {
            $goto(`../../../../app/${appId}/automate/${history.automationId}`)
          }}
        >
          {$_(
            "pages.builder.portal.overview.appId.automation-history._components.HistoryDetailsPanel.Edit_automation"
          )}
        </Button>
      </div>
    {/if}
    {#key history}
      <div class="history">
        <TestDisplay testResults={history} width="100%" />
      </div>
    {/key}
  </Layout>
{:else}
  <Body
    >{$_(
      "pages.builder.portal.overview.appId.automation-history._components.HistoryDetailsPanel.No_details"
    )}</Body
  >
{/if}

<style>
  .controls {
    display: flex;
    gap: var(--spacing-s);
    justify-content: space-between;
    align-items: center;
  }
  .cron-error {
    display: flex;
    width: 100%;
    justify-content: center;
  }
  .history {
    margin: 0 -30px;
  }
</style>

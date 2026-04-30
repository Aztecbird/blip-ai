/**
 * TowerService: Manages the visual updates for the Polyphony Tower.
 */
class TowerService {
  constructor() {
    this.tower = document.getElementById('blip-tower');
    this.districts = {
      perception: document.getElementById('dist-perception'),
      planning: document.getElementById('dist-planning'),
      tool: document.getElementById('dist-tool'),
      memory: document.getElementById('dist-memory'),
      bridge: document.getElementById('dist-bridge'),
      expression: document.getElementById('dist-expression')
    };
    this.status = document.getElementById('tower-status');
    this.capId = document.getElementById('tower-capsule-id');
  }

  show() {
    if (this.tower) this.tower.classList.add('active');
  }

  hide() {
    if (this.tower) this.tower.classList.remove('active');
  }

  updateDistrict(activeName) {
    Object.entries(this.districts).forEach(([name, el]) => {
      if (el) el.classList.toggle('active', name === activeName);
    });
    
    if (this.status) {
      this.status.innerText = `ROUTING: ${activeName.toUpperCase()} DISTRICT`;
    }
  }

  setCapsule(id) {
    if (this.capId) this.capId.innerText = id.substring(0, 12);
    this.show();
  }

  setCompleted() {
    if (this.status) this.status.innerText = 'COMMAND COMPLETED';
    setTimeout(() => this.hide(), 3000);
  }
}

export const towerService = typeof window !== 'undefined' ? new TowerService() : null;

import { ValueObject } from "../value-object";
import { SubjectAttributes } from "./subject-attributes";
import { ResourceAttributes } from "./resource-attributes";
import { Action } from "./action";
import { Instant } from "../datetime/instant";

interface AccessRequestProps {
  subject: SubjectAttributes;
  resource: ResourceAttributes;
  action: Action;
  requestedAt: Instant;
}

export class AccessRequest extends ValueObject<AccessRequestProps> {
  constructor(props: AccessRequestProps) {
    super(props);
  }

  static of(
    subject: SubjectAttributes,
    resource: ResourceAttributes,
    action: Action,
    requestedAt?: Instant,
  ): AccessRequest {
    return new AccessRequest({
      subject,
      resource,
      action,
      requestedAt: requestedAt ?? Instant.now(),
    });
  }

  get subject(): SubjectAttributes { return this.props.subject; }
  get resource(): ResourceAttributes { return this.props.resource; }
  get action(): Action { return this.props.action; }
  get requestedAt(): Instant { return this.props.requestedAt; }

  toJSON() {
    return {
      subject: this.props.subject.toJSON(),
      resource: this.props.resource.toJSON(),
      action: this.props.action.toJSON(),
      requestedAt: this.props.requestedAt.toJSON(),
    };
  }
}

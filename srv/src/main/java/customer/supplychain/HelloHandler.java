package customer.supplychain;

import org.springframework.stereotype.Component;

import com.sap.cds.services.handler.EventHandler;
import com.sap.cds.services.handler.annotations.On;
import com.sap.cds.services.handler.annotations.ServiceName;

import cds.gen.helloservice.EchoContext;
import cds.gen.helloservice.HelloContext;

@Component
@ServiceName("HelloService")
public class HelloHandler implements EventHandler {

    @On(event = HelloContext.CDS_NAME)
    public void hello(HelloContext context) {
        context.setResult("Hello, " + context.getName() + "!");
    }

    @On(event = EchoContext.CDS_NAME)
    public void echo(EchoContext context) {
        context.setResult("You said: " + context.getMessage());
    }
}